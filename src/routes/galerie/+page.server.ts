import { getWowGallery } from '#lib/server/gallery.ts';
import { now } from '#lib/server/time.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const before = url.searchParams.get('bis') ?? undefined;
	return getWowGallery(locals.user!.id, now(), before);
};
