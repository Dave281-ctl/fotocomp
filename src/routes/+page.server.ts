import { fail } from '@sveltejs/kit';
import { lastRevealedDay, lastWeeklyVoteDay, themePhase } from '#lib/schedule.ts';
import { getCurrentRound, getParticipation } from '#lib/server/feedback.ts';
import { getDayPhotos } from '#lib/server/gallery.ts';
import { deletePhoto, findPhoto, savePhoto, UploadError } from '#lib/server/photos.ts';
import { selectTheme } from '#lib/server/current-theme.ts';
import { now } from '#lib/server/time.ts';
import { getMembership, type Membership } from '#lib/server/themes.ts';
import { getMyPicks, getWeekPhotos, getWeeklyResult, savePicks } from '#lib/server/weekly.ts';
import type { Actions, PageServerLoad } from './$types';

/** Gibt es in diesem Thema gerade etwas zu tun (hochladen, bewerten, Wochenwahl)? */
async function hasTodo({ theme }: Membership, userId: number, t: Date) {
	const phase = themePhase(theme, t);
	if (phase.kind === 'upload') return !(await findPhoto(userId, theme.id, phase.day));
	if (phase.kind === 'voting') {
		const photos = await getDayPhotos(theme.id, phase.day, userId, t);
		return photos.some((p) => !p.isOwn && p.myStars === null);
	}
	if (phase.kind === 'weekly') {
		const picks = await getMyPicks(theme.id, phase.day, userId);
		return picks.length === 0 && (await getWeekPhotos(theme.id, phase.day, userId, t)).length > 0;
	}
	return false;
}

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const user = locals.user!;
	const { memberships, current: membership } = await selectTheme(user.id, url, cookies);
	if (!membership) return { theme: null };

	const { theme } = membership;
	const t = now();
	const tabs =
		memberships.length > 1
			? await Promise.all(
					memberships.map(async (m) => ({
						id: m.theme.id,
						title: m.theme.title,
						todo: m.theme.id !== theme.id && (await hasTodo(m, user.id, t))
					}))
				)
			: [];
	const phase = themePhase(theme, t);
	const myPhoto = phase.kind === 'upload' ? await findPhoto(user.id, theme.id, phase.day) : null;
	const votingPhotos =
		phase.kind === 'voting' ? await getDayPhotos(theme.id, phase.day, user.id, t) : [];

	const weekPhotos =
		phase.kind === 'weekly' ? await getWeekPhotos(theme.id, phase.day, user.id, t) : [];
	const myPicks = phase.kind === 'weekly' ? await getMyPicks(theme.id, phase.day, user.id) : [];

	const weeklyDay = lastWeeklyVoteDay(theme, t);
	const weeklyResult = weeklyDay ? await getWeeklyResult(theme.id, weeklyDay, user.id, t) : null;

	// Hinweis auf eine laufende oder in den nächsten 24 Stunden beginnende Feedback-Runde
	const round = await getCurrentRound(theme, t);
	const feedbackRound =
		round && round.startsAt.getTime() - t.getTime() < 24 * 3_600_000
			? {
					active: round.startsAt <= t,
					startsAt: round.startsAt,
					endsAt: round.endsAt,
					participating: await getParticipation(round, user.id)
				}
			: null;

	// Resultat der letzten enthüllten Tagesrunde
	const resultDay = lastRevealedDay(theme, t);
	const results = resultDay ? await getDayPhotos(theme.id, resultDay, user.id, t) : [];

	return {
		tabs,
		theme,
		phase,
		myPhoto,
		votingPhotos,
		weekPhotos,
		myPicks,
		weeklyResult,
		feedbackRound,
		resultDay: results.length ? resultDay : null,
		results,
		feedbackDefault: user.feedbackDefault
	};
};

/** Gibt Thema und Tag zurück, falls jetzt hochgeladen werden darf. */
async function uploadContext(userId: number, form: FormData) {
	const membership = await getMembership(userId, Number(form.get('theme')));
	if (!membership) return null;
	const phase = themePhase(membership.theme, now());
	return phase.kind === 'upload' ? { theme: membership.theme, day: phase.day } : null;
}

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const ctx = await uploadContext(user.id, form);
		if (!ctx) return fail(400, { uploadError: 'Hochladen ist im Moment nicht möglich.' });

		const file = form.get('photo');
		if (!(file instanceof File)) return fail(400, { uploadError: 'Bitte ein Foto auswählen.' });
		try {
			await savePhoto({ user, ...ctx, file, feedbackWanted: form.get('feedback') === 'on' });
		} catch (e) {
			if (e instanceof UploadError) return fail(400, { uploadError: e.message });
			throw e;
		}
	},

	weekly: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const membership = await getMembership(user.id, Number(form.get('theme')));
		if (!membership) return fail(400, { weeklyError: 'Du machst bei diesem Thema nicht mit.' });
		const picks = String(form.get('picks') ?? '')
			.split(',')
			.filter(Boolean)
			.map(Number);
		const error = await savePicks(membership.theme, user.id, picks, now());
		if (error) return fail(400, { weeklyError: error });
		return { weeklySaved: true };
	},

	deletePhoto: async ({ request, locals }) => {
		const user = locals.user!;
		const ctx = await uploadContext(user.id, await request.formData());
		if (!ctx) return fail(400);
		const photo = await findPhoto(user.id, ctx.theme.id, ctx.day);
		if (photo) await deletePhoto(photo);
	}
};
