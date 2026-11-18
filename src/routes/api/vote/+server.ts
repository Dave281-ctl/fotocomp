import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { canVote, castVote } from '#lib/server/gallery.ts';
import { photos, themes } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import type { RequestHandler } from './$types';

/** Speichert die Sterne für ein Foto (1–5). */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user!;
	const { photoId, stars } = await request.json();
	if (!Number.isInteger(stars) || stars < 1 || stars > 5) error(400, 'Ungültige Bewertung');

	const [row] = Number.isInteger(photoId)
		? await db
				.select({ photo: photos, theme: themes })
				.from(photos)
				.innerJoin(themes, eq(photos.themeId, themes.id))
				.where(eq(photos.id, photoId))
		: [];
	if (!row) error(404);
	if (!(await canVote(row.photo, user, row.theme, now()))) {
		error(403, 'Bewerten ist nur während der Bewertungszeit möglich.');
	}
	await castVote(row.photo.id, user.id, stars);
	return json({ ok: true });
};
