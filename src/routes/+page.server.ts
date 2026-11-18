import { themePhase } from '#lib/schedule.ts';
import { now } from '#lib/server/time.ts';
import { getMembership } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const membership = await getMembership(locals.user!.id);
	if (!membership) return { theme: null };
	const { theme } = membership;
	return { theme, phase: themePhase(theme, now()) };
};
