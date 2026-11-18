import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
	INVITATION_TTL,
	isValidEmail,
	normalizeEmail,
	randomToken,
	sha256
} from '#lib/server/auth.ts';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { sendInviteMail } from '#lib/server/mail.ts';
import { invitations, users } from '#lib/server/schema.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const accepted = alias(users, 'accepted');
	const list = await db
		.select({
			id: invitations.id,
			email: invitations.email,
			createdAt: invitations.createdAt,
			expiresAt: invitations.expiresAt,
			acceptedName: accepted.name
		})
		.from(invitations)
		.leftJoin(accepted, eq(invitations.acceptedBy, accepted.id))
		.where(eq(invitations.inviterId, locals.user!.id))
		.orderBy(desc(invitations.createdAt))
		.limit(20);
	return { invitations: list };
};

/** Legt eine Einladung an und gibt den (nur jetzt sichtbaren) Link zurück. */
async function createInvitation(inviterId: number, email: string | null) {
	const token = randomToken();
	await db.insert(invitations).values({
		tokenHash: sha256(token),
		inviterId,
		email,
		expiresAt: new Date(Date.now() + INVITATION_TTL)
	});
	return `${config.origin}/registrieren?einladung=${token}`;
}

export const actions: Actions = {
	email: async ({ request, locals }) => {
		const user = locals.user!;
		const email = normalizeEmail(String((await request.formData()).get('email') ?? ''));
		if (!isValidEmail(email)) return fail(400, { error: 'Bitte eine gültige E-Mail-Adresse.' });
		const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
		if (existing) return fail(400, { error: 'Diese Person ist schon dabei.' });

		const url = await createInvitation(user.id, email);
		await sendInviteMail(email, user.name, url);
		return { sent: email };
	},

	link: async ({ locals }) => {
		return { link: await createInvitation(locals.user!.id, null) };
	},

	revoke: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		await db
			.delete(invitations)
			.where(and(eq(invitations.id, id), eq(invitations.inviterId, locals.user!.id)));
	}
};
