import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { countViews, markSeen } from '#lib/server/news-views.ts';
import { users } from '#lib/server/schema.ts';
import type { RequestHandler } from './$types';

const validKeys = (keys: unknown) =>
	Array.isArray(keys)
		? keys.filter((k): k is string => typeof k === 'string' && k.length < 80).slice(0, 50)
		: [];

/**
 * «Heute» wurde angesehen: { at, keys } – Neuigkeiten bis `at` sind nicht mehr «neu»,
 * die gezeigten `keys` zählen einen Besuch. { done: key } – Neuigkeit angetippt.
 * Wird erst im Browser nach dem Anzeigen aufgerufen (nicht schon beim Vorladen).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user!;
	const body = await request.json().catch(() => ({}));
	if (typeof body.done === 'string' && body.done.length < 80) {
		await markSeen(user.id, body.done);
		return json({ ok: true });
	}
	const seen = new Date(body.at);
	if (Number.isNaN(seen.getTime())) return json({ ok: false }, { status: 400 });
	await db.update(users).set({ newsSeenAt: seen }).where(eq(users.id, user.id));
	await countViews(user.id, validKeys(body.keys));
	return json({ ok: true });
};
