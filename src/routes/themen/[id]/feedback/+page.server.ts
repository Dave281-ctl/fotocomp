import { fail } from '@sveltejs/kit';
import { feedbackRoundDays } from '#lib/schedule.ts';
import {
	getCurrentRound,
	getParticipation,
	getRoundPhotos,
	setParticipation
} from '#lib/server/feedback.ts';
import { requireMembership } from '#lib/server/theme-guard.ts';
import { now } from '#lib/server/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const membership = await requireMembership(user.id, Number(params.id));
	const t = now();
	const round = await getCurrentRound(membership.theme, t);
	if (!round) return { round: null };

	const active = round.startsAt <= t;
	const participating = await getParticipation(round, user.id);
	const { others, photos } =
		active && participating ? await getRoundPhotos(round, user.id, t) : { others: 0, photos: [] };
	return {
		round,
		active,
		participating,
		always: membership.member.feedbackAlways,
		days: feedbackRoundDays(round.startsAt),
		others,
		photos
	};
};

export const actions: Actions = {
	participate: async ({ params, request, locals }) => {
		const user = locals.user!;
		const { theme } = await requireMembership(user.id, Number(params.id));
		const round = await getCurrentRound(theme, now());
		if (!round) return fail(400);
		const answer = String((await request.formData()).get('answer'));
		await setParticipation(round, user.id, answer !== 'no', answer === 'always');
	}
};
