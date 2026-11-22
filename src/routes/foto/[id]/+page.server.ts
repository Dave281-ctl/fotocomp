import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { isRevealed } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { addFeedback, canGiveFeedback, deleteFeedback, getFeedback } from '#lib/server/feedback.ts';
import { canSeePhoto, canVote, getDayPhotos } from '#lib/server/gallery.ts';
import { photos, themes, users } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import type { Actions, PageServerLoad } from './$types';
import { fileType } from '#lib/server/photos.ts';

async function loadPhoto(idParam: string) {
	const id = Number(idParam);
	const [row] = Number.isInteger(id)
		? await db
				.select({ photo: photos, theme: themes, owner: users })
				.from(photos)
				.innerJoin(themes, eq(photos.themeId, themes.id))
				.innerJoin(users, eq(photos.userId, users.id))
				.where(eq(photos.id, id))
		: [];
	return row ?? null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const t = now();
	const row = await loadPhoto(params.id);
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
		original: { type: fileType(photo.originalPath), sizeBytes: photo.sizeBytes },
		theme: { id: theme.id, title: theme.title },
		day: photo.day,
		revealed: isRevealed(photo.day, t),
		canVote: await canVote(photo, user, theme, t),
		canDownload: isOwn || user.role === 'admin',
		isOwn,
		feedbackWanted: photo.feedbackWanted,
		feedback: await getFeedback(photo, user),
		canGiveFeedback: await canGiveFeedback(photo, user, t),
		prev: pos > 0 ? day[pos - 1].id : null,
		next: pos >= 0 && pos < day.length - 1 ? day[pos + 1].id : null
	};
};

export const actions: Actions = {
	feedback: async ({ params, request, locals }) => {
		const user = locals.user!;
		const row = await loadPhoto(params.id);
		if (!row || !(await canGiveFeedback(row.photo, user, now()))) error(403);
		const body = String((await request.formData()).get('body') ?? '').trim();
		if (body.length < 2) return fail(400, { feedbackError: 'Bitte schreibe ein paar Worte.' });
		if (body.length > 2000) return fail(400, { feedbackError: 'Maximal 2000 Zeichen.' });
		await addFeedback(row.photo.id, user.id, body);
		return { feedbackSent: true };
	},

	deleteFeedback: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		await deleteFeedback(id, locals.user!);
	},

	feedbackWanted: async ({ params, request, locals }) => {
		const row = await loadPhoto(params.id);
		if (!row || row.photo.userId !== locals.user!.id) error(403);
		const wanted = (await request.formData()).get('wanted') === 'true';
		await db.update(photos).set({ feedbackWanted: wanted }).where(eq(photos.id, row.photo.id));
	}
};
