import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { users } from '#lib/server/schema.ts';
import type { RequestHandler } from './$types';

/**
 * «Heute» wurde angesehen: Neuigkeiten bis zu diesem Zeitpunkt gelten als gesehen.
 * Wird erst im Browser nach dem Anzeigen aufgerufen (nicht schon beim Vorladen).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { at } = await request.json().catch(() => ({}));
	const seen = new Date(at);
	if (Number.isNaN(seen.getTime())) return json({ ok: false }, { status: 400 });
	await db.update(users).set({ newsSeenAt: seen }).where(eq(users.id, locals.user!.id));
	return json({ ok: true });
};
