import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { getGallery } from '#lib/server/gallery.ts';
import { photos, themes } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import { getMemberships } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	// Themen, zu denen es Fotos gibt (für die Auswahl)
	const themeList = await db
		.selectDistinct({ id: themes.id, title: themes.title, startDate: themes.startDate })
		.from(themes)
		.innerJoin(photos, eq(photos.themeId, themes.id))
		.orderBy(desc(themes.startDate));

	const requested = Number(url.searchParams.get('thema'));
	const [membership] = await getMemberships(user.id);
	const themeId =
		themeList.find((t) => t.id === requested)?.id ??
		themeList.find((t) => t.id === membership?.theme.id)?.id ??
		themeList[0]?.id;
	if (!themeId) return { themes: themeList, themeId: null, days: [], more: null };

	const before = url.searchParams.get('bis') ?? undefined;
	const gallery = await getGallery(themeId, user.id, now(), { before });
	return { themes: themeList, themeId, ...gallery };
};
