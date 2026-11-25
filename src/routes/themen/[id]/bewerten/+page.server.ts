import { getDayPhotos } from '#lib/server/gallery.ts';
import { requireMembership } from '#lib/server/theme-guard.ts';
import { now } from '#lib/server/time.ts';
import { getPhase } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const { theme } = await requireMembership(user.id, Number(params.id));
	const t = now();
	const phase = await getPhase(theme, t);
	return {
		votingPhotos: phase.kind === 'voting' ? await getDayPhotos(theme.id, phase.day, user.id, t) : []
	};
};
