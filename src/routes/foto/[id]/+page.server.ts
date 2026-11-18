import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { isRevealed } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { canSeePhoto, canVote, getDayPhotos } from '#lib/server/gallery.ts';
import { photos, themes, users } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const t = now();
	const id = Number(params.id);
	const [row] = Number.isInteger(id)
		? await db
				.select({ photo: photos, theme: themes, owner: users })
				.from(photos)
				.innerJoin(themes, eq(photos.themeId, themes.id))
				.innerJoin(users, eq(photos.userId, users.id))
				.where(eq(photos.id, id))
		: [];
	if (!row || !canSeePhoto(row.photo, user, t)) error(404, 'Foto nicht gefunden');
	const { photo, theme, owner } = row;

	// Reihenfolge des Tages für «vorheriges/nächstes Foto»
	const day = await getDayPhotos(theme.id, photo.day, user.id, t);
	const pos = day.findIndex((p) => p.id === photo.id);
	const feed = day[pos];

	const isOwn = owner.id === user.id;
	const exif = { ...photo.exif };
	if (!owner.showGps && !isOwn) {
		delete exif.latitude;
		delete exif.longitude;
		delete exif.altitude;
	}

	return {
		photo: feed ?? null,
		width: photo.width,
		height: photo.height,
		exif,
		theme: { id: theme.id, title: theme.title },
		day: photo.day,
		revealed: isRevealed(photo.day, t),
		canVote: await canVote(photo, user, theme, t),
		canDownload: isOwn || user.role === 'admin',
		prev: pos > 0 ? day[pos - 1].id : null,
		next: pos >= 0 && pos < day.length - 1 ? day[pos + 1].id : null
	};
};
