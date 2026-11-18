import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import {
	TooManyRequestsError,
	isValidEmail,
	normalizeEmail,
	redeemCode,
	safeRedirect,
	sendLoginLink,
	signIn
} from '#lib/server/auth.ts';
import { db } from '#lib/server/db.ts';
import { users } from '#lib/server/schema.ts';
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
			try {
				await sendLoginLink({ email, userId: user.id });
			} catch (e) {
				if (e instanceof TooManyRequestsError) return fail(429, { email, error: e.message });
				throw e;
			}
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
