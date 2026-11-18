import type { Cookies } from '@sveltejs/kit';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from './db.ts';
import { invitations, loginTokens, sessions, users, type User } from './schema.ts';

const DAY = 24 * 60 * 60 * 1000;
export const LOGIN_TOKEN_TTL = 15 * 60 * 1000;
/** Gleitende Laufzeit: jede Nutzung verlängert die Session wieder auf 30 Tage. */
export const SESSION_TTL = 30 * DAY;
/** Spätestens nach einem Jahr ist eine neue Anmeldung nötig. */
const SESSION_MAX_AGE = 365 * DAY;
const MAX_CODE_ATTEMPTS = 5;

export const SESSION_COOKIE = 'session';

export function randomToken(): string {
	return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// ---------------------------------------------------------------- Login-Tokens

interface TokenInput {
	email: string;
	userId?: number;
	name?: string;
	invitationId?: number;
}

/** Erzeugt einen einmaligen Login-Link-Token und einen 6-stelligen Code. */
export async function createLoginToken(input: TokenInput) {
	const token = randomToken();
	const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
	await db.insert(loginTokens).values({
		email: input.email,
		userId: input.userId,
		name: input.name,
		invitationId: input.invitationId,
		tokenHash: sha256(token),
		codeHash: sha256(code),
		expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL)
	});
	return { token, code };
}

type LoginToken = typeof loginTokens.$inferSelect;

/** Löst einen Login-Link ein und liefert den (ggf. neu angelegten) User. */
export async function redeemToken(token: string): Promise<User | null> {
	const [row] = await db
		.select()
		.from(loginTokens)
		.where(
			and(
				eq(loginTokens.tokenHash, sha256(token)),
				isNull(loginTokens.usedAt),
				gt(loginTokens.expiresAt, new Date())
			)
		);
	return row ? consume(row) : null;
}

/** Löst den 6-stelligen Code für eine E-Mail-Adresse ein. */
export async function redeemCode(email: string, code: string): Promise<User | null> {
	const [row] = await db
		.select()
		.from(loginTokens)
		.where(
			and(
				eq(loginTokens.email, normalizeEmail(email)),
				isNull(loginTokens.usedAt),
				gt(loginTokens.expiresAt, new Date())
			)
		)
		.orderBy(desc(loginTokens.createdAt))
		.limit(1);
	if (!row || row.attempts >= MAX_CODE_ATTEMPTS) return null;

	if (!safeEqual(row.codeHash, sha256(code.replace(/\D/g, '')))) {
		await db
			.update(loginTokens)
			.set({ attempts: row.attempts + 1 })
			.where(eq(loginTokens.id, row.id));
		return null;
	}
	return consume(row);
}

async function consume(row: LoginToken): Promise<User | null> {
	// Atomar als benutzt markieren, damit ein Token nur einmal funktioniert.
	const used = await db
		.update(loginTokens)
		.set({ usedAt: new Date() })
		.where(and(eq(loginTokens.id, row.id), isNull(loginTokens.usedAt)))
		.returning({ id: loginTokens.id });
	if (used.length === 0) return null;

	if (row.userId) {
		const [user] = await db.select().from(users).where(eq(users.id, row.userId));
		return user && !user.disabled ? user : null;
	}

	// Registrierung: User erst jetzt anlegen, nachdem die Adresse bestätigt ist.
	const [existing] = await db.select().from(users).where(eq(users.email, row.email));
	if (existing) return existing.disabled ? null : existing;

	return db.transaction(async (tx) => {
		const [{ total }] = await tx.select({ total: count() }).from(users);
		const name = row.name?.trim() || row.email.split('@')[0];
		const [user] = await tx
			.insert(users)
			.values({
				email: row.email,
				name,
				folder: `${slugify(name)}-${randomBytes(3).toString('hex')}`,
				role: total === 0 ? 'admin' : 'user'
			})
			.returning();
		if (row.invitationId) {
			await tx
				.update(invitations)
				.set({ acceptedBy: user.id, acceptedAt: new Date() })
				.where(and(eq(invitations.id, row.invitationId), isNull(invitations.acceptedBy)));
		}
		return user;
	});
}

export function slugify(value: string): string {
	return (
		value
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 40) || 'user'
	);
}

// -------------------------------------------------------------------- Sessions

export async function createSession(userId: number) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + SESSION_TTL);
	await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
	return { token, expiresAt };
}

/**
 * Prüft das Session-Cookie. Verlängert die Session gleitend (höchstens einmal
 * pro Tag in die Datenbank geschrieben) bis zum Maximum von einem Jahr.
 */
export async function validateSession(token: string) {
	const id = sha256(token);
	const [row] = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id));
	if (!row) return null;

	const now = Date.now();
	const { session, user } = row;
	if (session.expiresAt.getTime() <= now || user.disabled) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}

	let expiresAt = session.expiresAt;
	const maxExpiry = session.createdAt.getTime() + SESSION_MAX_AGE;
	if (expiresAt.getTime() - now < SESSION_TTL - DAY && expiresAt.getTime() < maxExpiry) {
		expiresAt = new Date(Math.min(now + SESSION_TTL, maxExpiry));
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
	}
	return { user, expiresAt };
}

export async function deleteSession(token: string) {
	await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

export async function deleteUserSessions(userId: number) {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

// ------------------------------------------------------------------ Einladungen

export const INVITATION_TTL = 14 * DAY;

/** Liefert eine gültige, noch nicht angenommene Einladung zum Token. */
export async function findInvitation(token: string) {
	const [row] = await db
		.select({ invitation: invitations, inviterName: users.name })
		.from(invitations)
		.innerJoin(users, eq(invitations.inviterId, users.id))
		.where(
			and(
				eq(invitations.tokenHash, sha256(token)),
				isNull(invitations.acceptedBy),
				gt(invitations.expiresAt, new Date())
			)
		);
	return row ?? null;
}

// ------------------------------------------------------------------ Helfer

export function setSessionCookie(cookies: Cookies, token: string, expires: Date) {
	cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', expires });
}

/** Meldet einen User an: Session anlegen, Cookies setzen. */
export async function signIn(cookies: Cookies, user: User) {
	const { token, expiresAt } = await createSession(user.id);
	setSessionCookie(cookies, token, expiresAt);
	cookies.set('theme', user.themePref, {
		path: '/',
		httpOnly: false,
		maxAge: 60 * 60 * 24 * 365
	});
}

/** Erlaubt nur interne Weiterleitungen (Schutz vor Open Redirects). */
export function safeRedirect(target: string | null | undefined): string {
	return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
}
