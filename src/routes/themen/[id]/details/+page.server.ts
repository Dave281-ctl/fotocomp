import { error, fail, redirect } from '@sveltejs/kit';
import { endRound, getCurrentRound, startManualRound } from '#lib/server/feedback.ts';
import { now } from '#lib/server/time.ts';
import {
	canManageTheme,
	endTheme,
	getTheme,
	leaveTheme,
	listMembers,
	themePhase
} from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const theme = await getTheme(Number(params.id));
	const t = now();
	const ended = themePhase(theme, t).kind === 'ended';
	const round = ended ? null : await getCurrentRound(theme, t);
	return {
		round,
		roundActive: !!round && round.startsAt <= t,
		ended,
		members: await listMembers(theme.id)
	};
};

export const actions: Actions = {
	leave: async ({ params, locals }) => {
		await leaveTheme(Number(params.id), locals.user!.id);
		redirect(303, '/themen');
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
		else return fail(400);
	},
	end: async ({ params, locals }) => {
		const theme = await getTheme(Number(params.id));
		if (!canManageTheme(locals.user!, theme)) error(403);
		await endTheme(theme.id);
		redirect(303, '/themen');
	}
};
