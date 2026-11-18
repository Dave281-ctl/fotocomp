import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { users } from '#lib/server/schema.ts';
import type { RequestHandler } from './$types';

/** Speichert den gewählten Hell-/Dunkelmodus im Cookie und im Profil. */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const { theme } = await request.json();
	const value = theme === 'light' ? 'light' : 'dark';
	cookies.set('theme', value, { path: '/', httpOnly: false, maxAge: 60 * 60 * 24 * 365 });
	if (locals.user) {
		await db.update(users).set({ themePref: value }).where(eq(users.id, locals.user.id));
	}
	return new Response(null, { status: 204 });
};
