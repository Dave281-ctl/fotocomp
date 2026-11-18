import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import {
	createLoginToken,
	isValidEmail,
	normalizeEmail,
	redeemCode,
	safeRedirect,
	signIn
} from '#lib/server/auth.ts';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { users } from '#lib/server/schema.ts';
import { sendLoginMail } from '#lib/server/mail.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safeRedirect(url.searchParams.get('weiter')));
};

export const actions: Actions = {
	send: async ({ request }) => {
		const form = await request.formData();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		if (!isValidEmail(email))
			return fail(400, { email, error: 'Bitte eine gültige E-Mail-Adresse.' });

		const [user] = await db.select().from(users).where(eq(users.email, email));
		// Aus Datenschutzgründen verraten wir nicht, ob die Adresse registriert ist.
		if (user && !user.disabled) {
			const { token, code } = await createLoginToken({ email, userId: user.id });
			await sendLoginMail(email, `${config.origin}/auth/verify?token=${token}`, code, false);
		}
		return { sent: true, email };
	},

	code: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		const code = String(form.get('code') ?? '');
		const user = await redeemCode(email, code);
		if (!user) {
			return fail(400, { sent: true, email, error: 'Der Code ist falsch oder abgelaufen.' });
		}
		await signIn(cookies, user);
		redirect(303, safeRedirect(url.searchParams.get('weiter')));
	}
};
