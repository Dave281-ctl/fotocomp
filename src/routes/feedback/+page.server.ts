import { fail, redirect } from '@sveltejs/kit';
import {
	getCurrentRound,
	getParticipation,
	getRoundPhotos,
	setParticipation
} from '#lib/server/feedback.ts';
import { now } from '#lib/server/time.ts';
import { getMembership } from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const membership = await getMembership(user.id);
	if (!membership) redirect(303, '/themen');
	const t = now();
	const round = await getCurrentRound(membership.theme, t);
	if (!round) return { theme: membership.theme, round: null };

	const active = round.startsAt <= t;
	const participating = await getParticipation(round, user.id);
	return {
		theme: membership.theme,
		round,
		active,
		participating,
		always: membership.member.feedbackAlways,
		photos: active && participating ? await getRoundPhotos(round, user.id, t) : []
	};
};

export const actions: Actions = {
	participate: async ({ request, locals }) => {
		const user = locals.user!;
		const membership = await getMembership(user.id);
		if (!membership) return fail(400);
		const round = await getCurrentRound(membership.theme, now());
		if (!round) return fail(400);
		const answer = String((await request.formData()).get('answer'));
		await setParticipation(round, user.id, answer !== 'no', answer === 'always');
	}
};
