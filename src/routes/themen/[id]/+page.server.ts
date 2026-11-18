import { error, fail, redirect } from '@sveltejs/kit';
import { themePhase } from '#lib/schedule.ts';
import { endRound, getCurrentRound, startManualRound } from '#lib/server/feedback.ts';
import { now } from '#lib/server/time.ts';
import {
	canManageTheme,
	endTheme,
	getMembership,
	getTheme,
	joinTheme,
	leaveTheme,
	listMembers
} from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const theme = await getTheme(Number(params.id));
	const membership = await getMembership(user.id);
	const t = now();
	const phase = themePhase(theme, t).kind;
	const round = phase === 'ended' ? null : await getCurrentRound(theme, t);
	return {
		round,
		roundActive: !!round && round.startsAt <= t,
		theme,
		phase,
		members: await listMembers(theme.id),
		isMine: membership?.theme.id === theme.id,
		hasOtherTheme: !!membership && membership.theme.id !== theme.id,
		canManage: canManageTheme(user, theme)
	};
};

export const actions: Actions = {
	join: async ({ params, locals }) => {
		const theme = await getTheme(Number(params.id));
		if (themePhase(theme, now()).kind === 'ended') return fail(400);
		await joinTheme(theme.id, locals.user!.id);
	},
	leave: async ({ params, locals }) => {
		await leaveTheme(Number(params.id), locals.user!.id);
	},
	startRound: async ({ params, request, locals }) => {
		const theme = await getTheme(Number(params.id));
		if (!canManageTheme(locals.user!, theme)) error(403);
		const hours = Math.min(168, Math.max(1, Number((await request.formData()).get('hours')) || 24));
		await startManualRound(theme.id, hours);
	},
	endRound: async ({ params, request, locals }) => {
		const theme = await getTheme(Number(params.id));
		if (!canManageTheme(locals.user!, theme)) error(403);
		const round = await getCurrentRound(theme, now());
		const id = Number((await request.formData()).get('roundId'));
		if (round?.id === id) await endRound(id);
	},
	end: async ({ params, locals }) => {
		const theme = await getTheme(Number(params.id));
		if (!canManageTheme(locals.user!, theme)) error(403);
		await endTheme(theme.id);
		redirect(303, '/themen');
	}
};
