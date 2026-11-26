import { getDayPhotos } from '#lib/server/gallery.ts';
import { now } from '#lib/server/time.ts';
import { getMemberships, getPhase } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

/** Alle Themen, in denen gerade bewertet wird – auf einer Seite. */
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const t = now();
	const sections = [];
	for (const { theme } of await getMemberships(user.id)) {
		const phase = await getPhase(theme, t);
		if (phase.kind !== 'voting') continue;
		const photos = await getDayPhotos(theme.id, phase.day, user.id, t);
		if (photos.length === 0) continue;
		sections.push({
			theme: { id: theme.id, title: theme.title },
			day: phase.day,
			endsAt: phase.endsAt,
			photos
		});
	}
	return { sections };
};
