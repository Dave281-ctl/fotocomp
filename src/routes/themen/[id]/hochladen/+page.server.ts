import { fail } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import { deletePhoto, findPhoto, savePhoto, UploadError } from '#lib/server/photos.ts';
import { requireMembership } from '#lib/server/theme-guard.ts';
import { now } from '#lib/server/time.ts';
import { getPhase } from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const { theme } = await requireMembership(user.id, Number(params.id));
	const phase = await getPhase(theme, now());
	return {
		myPhoto: phase.kind === 'upload' ? await findPhoto(user.id, theme.id, phase.day) : null,
		feedbackDefault: user.feedbackDefault,
		maxUploadMb: config.maxUploadMb
	};
};

/** Thema und Tag, falls jetzt hochgeladen werden darf. */
async function uploadContext(userId: number, themeId: number) {
	const { theme } = await requireMembership(userId, themeId);
	const phase = await getPhase(theme, now());
	return phase.kind === 'upload' ? { theme, day: phase.day } : null;
}

export const actions: Actions = {
	upload: async ({ params, request, locals }) => {
		const user = locals.user!;
		const ctx = await uploadContext(user.id, Number(params.id));
		if (!ctx) return fail(400, { uploadError: 'Hochladen ist im Moment nicht möglich.' });
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

	deletePhoto: async ({ params, locals }) => {
		const user = locals.user!;
		const ctx = await uploadContext(user.id, Number(params.id));
		if (!ctx) return fail(400);
		const photo = await findPhoto(user.id, ctx.theme.id, ctx.day);
		if (photo) await deletePhoto(photo);
	}
};
