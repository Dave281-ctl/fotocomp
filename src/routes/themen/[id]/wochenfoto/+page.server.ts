import { fail } from '@sveltejs/kit';
import { lastWeeklyVoteDay } from '#lib/schedule.ts';
import { requireMembership } from '#lib/server/theme-guard.ts';
import { now } from '#lib/server/time.ts';
import { themePhase } from '#lib/server/themes.ts';
import { getMyPicks, getWeekPhotos, getWeeklyResult, savePicks } from '#lib/server/weekly.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const { theme } = await requireMembership(user.id, Number(params.id));
	const t = now();
	const phase = themePhase(theme, t);
	const weekly = phase.kind === 'weekly';
	const lastDay = lastWeeklyVoteDay(theme, t);
	return {
		weekPhotos: weekly ? await getWeekPhotos(theme.id, phase.day, user.id, t) : [],
		myPicks: weekly ? await getMyPicks(theme.id, phase.day, user.id) : [],
		// Ausserhalb der Wochenbewertung: das letzte Resultat
		result: !weekly && lastDay ? await getWeeklyResult(theme.id, lastDay, user.id, t) : null
	};
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		const user = locals.user!;
		const { theme } = await requireMembership(user.id, Number(params.id));
		const picks = String((await request.formData()).get('picks') ?? '')
			.split(',')
			.filter(Boolean)
			.map(Number);
		const error = await savePicks(theme, user.id, picks, now());
		if (error) return fail(400, { weeklyError: error });
		return { weeklySaved: true };
	}
};
