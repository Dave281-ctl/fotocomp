import { error } from '@sveltejs/kit';
import { and, count, eq, isNull } from 'drizzle-orm';
import { isThemeOpen, themePhase } from '../schedule.ts';
import { db } from './db.ts';
import { photos, themeMembers, themes, users, type Theme, type User } from './schema.ts';
import { getSettings } from './settings.ts';
import { now } from './time.ts';

export type Membership = { member: typeof themeMembers.$inferSelect; theme: Theme };

/** Alle laufenden (oder bald startenden) Themen, bei denen der User mitmacht. */
export async function getMemberships(userId: number): Promise<Membership[]> {
	const rows = await db
		.select({ member: themeMembers, theme: themes })
		.from(themeMembers)
		.innerJoin(themes, eq(themeMembers.themeId, themes.id))
		.where(and(eq(themeMembers.userId, userId), isNull(themeMembers.leftAt)))
		.orderBy(themes.startDate, themes.id);
	const t = now();
	return rows.filter((r) => isThemeOpen(r.theme, t));
}

/** Die Mitgliedschaft in einem bestimmten, noch offenen Thema. */
export async function getMembership(userId: number, themeId: number) {
	if (!Number.isInteger(themeId)) return null;
	return (await getMemberships(userId)).find((m) => m.theme.id === themeId) ?? null;
}

/**
 * Die Phase eines Themas inkl. «frühem Upload»: Wurde für den laufenden Tag
 * kein Foto hochgeladen, ist ab 20:00 schon der Upload für morgen offen.
 */
export async function getPhase(theme: Theme, t: Date) {
	const phase = themePhase(theme, t);
	if (phase.kind !== 'voting') return phase;
	const [{ n }] = await db
		.select({ n: count() })
		.from(photos)
		.where(and(eq(photos.themeId, theme.id), eq(photos.day, phase.day)));
	return n === 0 ? themePhase(theme, t, true) : phase;
}

export async function getTheme(id: number): Promise<Theme> {
	const [theme] = Number.isInteger(id)
		? await db.select().from(themes).where(eq(themes.id, id))
		: [];
	if (!theme) error(404, 'Thema nicht gefunden');
	return theme;
}

export async function isMember(themeId: number, userId: number) {
	const [row] = await db
		.select({ id: themeMembers.id })
		.from(themeMembers)
		.where(
			and(
				eq(themeMembers.themeId, themeId),
				eq(themeMembers.userId, userId),
				isNull(themeMembers.leftAt)
			)
		);
	return !!row;
}

export async function listMembers(themeId: number) {
	return db
		.select({ id: users.id, name: users.name })
		.from(themeMembers)
		.innerJoin(users, eq(themeMembers.userId, users.id))
		.where(and(eq(themeMembers.themeId, themeId), isNull(themeMembers.leftAt)))
		.orderBy(users.name);
}

export async function memberCount(themeId: number) {
	const [{ total }] = await db
		.select({ total: count() })
		.from(themeMembers)
		.where(and(eq(themeMembers.themeId, themeId), isNull(themeMembers.leftAt)));
	return total;
}

export async function canCreateTheme(user: User) {
	if (user.role === 'admin') return true;
	return (await getSettings()).themeCreation === 'all';
}

export function canManageTheme(user: User, theme: Theme) {
	return user.role === 'admin' || theme.createdBy === user.id;
}

/** Beitreten. Andere Themen bleiben bestehen; doppeltes Beitreten wird ignoriert. */
export async function joinTheme(themeId: number, userId: number) {
	await db.insert(themeMembers).values({ themeId, userId }).onConflictDoNothing();
}

export async function leaveTheme(themeId: number, userId: number) {
	await db
		.update(themeMembers)
		.set({ leftAt: new Date() })
		.where(
			and(
				eq(themeMembers.themeId, themeId),
				eq(themeMembers.userId, userId),
				isNull(themeMembers.leftAt)
			)
		);
}

/** Beendet ein Thema sofort und gibt alle Teilnehmer frei. */
export async function endTheme(themeId: number) {
	const at = new Date();
	await db.transaction(async (tx) => {
		await tx.update(themes).set({ endedAt: at }).where(eq(themes.id, themeId));
		await tx
			.update(themeMembers)
			.set({ leftAt: at })
			.where(and(eq(themeMembers.themeId, themeId), isNull(themeMembers.leftAt)));
	});
}

export { themePhase };

// --------------------------------------------------------------- Formular

export interface ThemeInput {
	title: string;
	description: string;
	startDate: string;
	endDate: string | null;
	weeklyVoteDay: number | null;
	feedbackDay: number | null;
	feedbackTime: string | null;
	feedbackHours: number;
}

const optionalDay = (value: FormDataEntryValue | null) => {
	const n = Number(value);
	return Number.isInteger(n) && n >= 1 && n <= 7 ? n : null;
};

/** Liest und prüft das Themen-Formular. Liefert entweder Werte oder eine Fehlermeldung. */
export function parseThemeForm(
	form: FormData
): { values: ThemeInput; error?: undefined } | { values: ThemeInput; error: string } {
	const recurring = form.get('mode') === 'recurring';
	const values: ThemeInput = {
		title: String(form.get('title') ?? '').trim(),
		description: String(form.get('description') ?? '').trim(),
		startDate: String(form.get('startDate') ?? ''),
		endDate: recurring ? null : String(form.get('endDate') ?? '') || null,
		weeklyVoteDay: optionalDay(form.get('weeklyVoteDay')),
		feedbackDay: optionalDay(form.get('feedbackDay')),
		feedbackTime: String(form.get('feedbackTime') ?? '') || null,
		feedbackHours: Math.min(168, Math.max(1, Number(form.get('feedbackHours')) || 24))
	};
	const isDate = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

	if (values.title.length < 2 || values.title.length > 60)
		return { values, error: 'Bitte einen Titel mit 2–60 Zeichen.' };
	if (values.description.length > 1000)
		return { values, error: 'Die Beschreibung ist zu lang (max. 1000 Zeichen).' };
	if (!isDate(values.startDate)) return { values, error: 'Bitte ein Startdatum wählen.' };
	if (!recurring && !isDate(values.endDate))
		return { values, error: 'Bitte ein Enddatum wählen oder «wiederkehrend» auswählen.' };
	if (values.endDate && values.endDate < values.startDate)
		return { values, error: 'Das Enddatum liegt vor dem Start.' };
	if (values.feedbackDay && !/^\d{2}:\d{2}$/.test(values.feedbackTime ?? ''))
		return { values, error: 'Bitte eine Startzeit für die Feedback-Runde angeben.' };
	if (!values.feedbackDay) values.feedbackTime = null;
	return { values };
}
