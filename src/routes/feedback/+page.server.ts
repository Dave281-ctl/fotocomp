import { fail, redirect } from '@sveltejs/kit';
import {
	getCurrentRound,
	getParticipation,
	getRoundPhotos,
	setParticipation
} from '#lib/server/feedback.ts';
import { feedbackRoundDays } from '#lib/schedule.ts';
import { now } from '#lib/server/time.ts';
import { selectTheme } from '#lib/server/current-theme.ts';
import { getMembership } from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const user = locals.user!;
	const { memberships, current: membership } = await selectTheme(user.id, url, cookies);
	if (!membership) redirect(303, '/themen');
	const t = now();
	const tabs = await Promise.all(
		memberships.map(async (m) => {
			const r = await getCurrentRound(m.theme, t);
			return { id: m.theme.id, title: m.theme.title, todo: !!r && r.startsAt <= t };
		})
	);
	const round = await getCurrentRound(membership.theme, t);
	if (!round) return { tabs, theme: membership.theme, round: null };

	const active = round.startsAt <= t;
	const participating = await getParticipation(round, user.id);
	const { others, photos } =
		active && participating ? await getRoundPhotos(round, user.id, t) : { others: 0, photos: [] };
	return {
		tabs,
		theme: membership.theme,
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
	participate: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const membership = await getMembership(user.id, Number(form.get('theme')));
		if (!membership) return fail(400);
		const round = await getCurrentRound(membership.theme, now());
		if (!round) return fail(400);
		const answer = String(form.get('answer'));
		await setParticipation(round, user.id, answer !== 'no', answer === 'always');
	}
};
