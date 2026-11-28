import { gameDay } from '#lib/schedule.ts';
import { getWowGallery } from '#lib/server/gallery.ts';
import { now } from '#lib/server/time.ts';
import { weekStart } from '#lib/wow.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const before = url.searchParams.get('bis') ?? undefined;
	const t = now();
	return {
		...(await getWowGallery(locals.user!.id, t, before)),
		// Für «Diese Woche» / «Letzte Woche»
		thisWeek: weekStart(gameDay(t))
	};
};
