import { fail, redirect } from '@sveltejs/kit';
import { redeemToken, signIn } from '#lib/server/auth.ts';
import type { Actions } from './$types';

// Der Link aus der Mail öffnet zuerst eine Seite mit einem Knopf. So lösen
// Link-Scanner von Mailprogrammen den einmaligen Link nicht versehentlich ein.
export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const user = await redeemToken(String(form.get('token') ?? ''));
		if (!user) return fail(400, { error: true });
		await signIn(cookies, user);
		redirect(303, '/');
	}
};
