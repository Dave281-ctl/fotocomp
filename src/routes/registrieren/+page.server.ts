import { fail, redirect } from '@sveltejs/kit';
import { count, eq } from 'drizzle-orm';
import {
	createLoginToken,
	findInvitation,
	isValidEmail,
	normalizeEmail
} from '#lib/server/auth.ts';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { users } from '#lib/server/schema.ts';
import { sendLoginMail } from '#lib/server/mail.ts';
import { getSettings } from '#lib/server/settings.ts';
import type { Actions, PageServerLoad } from './$types';

/** Registrieren ist erlaubt, wenn sie offen ist, eine Einladung vorliegt oder es noch keine User gibt. */
async function registrationAccess(inviteToken: string | null) {
	const invite = inviteToken ? await findInvitation(inviteToken) : null;
	const [{ total }] = await db.select({ total: count() }).from(users);
	const { registration } = await getSettings();
	return { invite, allowed: !!invite || total === 0 || registration === 'open' };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, '/');
	const token = url.searchParams.get('einladung');
	const { invite, allowed } = await registrationAccess(token);
	return {
		allowed,
		inviteToken: invite ? token : null,
		inviterName: invite?.inviterName ?? null,
		inviteEmail: invite?.invitation.email ?? null
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		const inviteToken = String(form.get('einladung') ?? '') || null;

		if (name.length < 2 || name.length > 40) {
			return fail(400, { name, email, error: 'Bitte einen Namen mit 2–40 Zeichen.' });
		}
		if (!isValidEmail(email)) {
			return fail(400, { name, email, error: 'Bitte eine gültige E-Mail-Adresse.' });
		}

		const { invite, allowed } = await registrationAccess(inviteToken);
		if (!allowed) return fail(403, { name, email, error: 'Registrierung nur mit Einladung.' });

		const [existing] = await db.select().from(users).where(eq(users.email, email));
		if (existing) {
			// Bereits registriert: einfach einen Login-Link schicken.
			if (!existing.disabled) {
				const { token, code } = await createLoginToken({ email, userId: existing.id });
				await sendLoginMail(email, `${config.origin}/auth/verify?token=${token}`, code, false);
			}
		} else {
			const { token, code } = await createLoginToken({
				email,
				name,
				invitationId: invite?.invitation.id
			});
			await sendLoginMail(email, `${config.origin}/auth/verify?token=${token}`, code, true);
		}
		return { sent: true, email };
	}
};
