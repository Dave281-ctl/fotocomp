import { asc, desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { getGallery, type GalleryView } from '#lib/server/gallery.ts';
import { photos, themes, users } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	// Auswahllisten: nur Themen und Personen, von denen es Fotos gibt
	const themeList = await db
		.selectDistinct({ id: themes.id, title: themes.title, startDate: themes.startDate })
		.from(themes)
		.innerJoin(photos, eq(photos.themeId, themes.id))
		.orderBy(desc(themes.startDate));
	const people = await db
		.selectDistinct({ id: users.id, name: users.name })
		.from(users)
		.innerJoin(photos, eq(photos.userId, users.id))
		.orderBy(asc(users.name));

	const param = (name: string) => Number(url.searchParams.get(name)) || null;
	const view: GalleryView = url.searchParams.get('ansicht') === 'alle' ? 'alle' : 'sieger';
	const themeId = themeList.some((t) => t.id === param('thema')) ? param('thema') : null;
	const userId = people.some((p) => p.id === param('person')) ? param('person') : null;
	const before = url.searchParams.get('bis') ?? undefined;

	const gallery = await getGallery(user.id, now(), { view, themeId, userId, before });
	return {
		themes: themeList.map(({ id, title }) => ({ id, title })),
		people,
		filter: { view, themeId, userId },
		...gallery
	};
};
