import { fail } from '@sveltejs/kit';
import { themePhase } from '#lib/schedule.ts';
import { deletePhoto, findPhoto, savePhoto, UploadError } from '#lib/server/photos.ts';
import { now } from '#lib/server/time.ts';
import { getMembership } from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const membership = await getMembership(user.id);
	if (!membership) return { theme: null };

	const { theme } = membership;
	const phase = themePhase(theme, now());
	const myPhoto =
		phase.kind === 'upload' || phase.kind === 'voting'
			? await findPhoto(user.id, theme.id, phase.day)
			: null;
	return { theme, phase, myPhoto, feedbackDefault: user.feedbackDefault };
};

/** Gibt Thema und Tag zurück, falls jetzt hochgeladen werden darf. */
async function uploadContext(userId: number) {
	const membership = await getMembership(userId);
	if (!membership) return null;
	const phase = themePhase(membership.theme, now());
	return phase.kind === 'upload' ? { theme: membership.theme, day: phase.day } : null;
}

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const user = locals.user!;
		const ctx = await uploadContext(user.id);
		if (!ctx) return fail(400, { uploadError: 'Hochladen ist nur von 05:00 bis 20:00 möglich.' });

		const form = await request.formData();
		const file = form.get('photo');
		if (!(file instanceof File)) return fail(400, { uploadError: 'Bitte ein Foto auswählen.' });
		try {
			await savePhoto({ user, ...ctx, file, feedbackWanted: form.get('feedback') === 'on' });
		} catch (e) {
			if (e instanceof UploadError) return fail(400, { uploadError: e.message });
			throw e;
		}
	},

	deletePhoto: async ({ locals }) => {
		const user = locals.user!;
		const ctx = await uploadContext(user.id);
		if (!ctx) return fail(400);
		const photo = await findPhoto(user.id, ctx.theme.id, ctx.day);
		if (photo) await deletePhoto(photo);
	}
};
