import { and, asc, desc, eq, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { deletePhoto } from '#lib/server/photos.ts';
import { photos, themes, users } from '#lib/server/schema.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 60;

export const load: PageServerLoad = async ({ url }) => {
	const userId = Number(url.searchParams.get('user')) || null;
	const themeId = Number(url.searchParams.get('thema')) || null;
	const day = url.searchParams.get('tag') || null;
	const pageNo = Math.max(1, Number(url.searchParams.get('seite')) || 1);

	const filters: SQL[] = [];
	if (userId) filters.push(eq(photos.userId, userId));
	if (themeId) filters.push(eq(photos.themeId, themeId));
	if (day) filters.push(eq(photos.day, day));

	const list = await db
		.select({
			id: photos.id,
			day: photos.day,
			sizeBytes: photos.sizeBytes,
			userName: users.name,
			themeTitle: themes.title
		})
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.innerJoin(themes, eq(photos.themeId, themes.id))
		.where(and(...filters))
		.orderBy(desc(photos.day), asc(users.name))
		.limit(PAGE_SIZE + 1)
		.offset((pageNo - 1) * PAGE_SIZE);

	return {
		photos: list.slice(0, PAGE_SIZE),
		hasMore: list.length > PAGE_SIZE,
		page: pageNo,
		filter: { userId, themeId, day },
		users: await db.select({ id: users.id, name: users.name }).from(users).orderBy(users.name),
		themes: await db
			.select({ id: themes.id, title: themes.title })
			.from(themes)
			.orderBy(desc(themes.startDate))
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const id = Number((await request.formData()).get('id'));
		const [photo] = await db.select().from(photos).where(eq(photos.id, id));
		if (photo) await deletePhoto(photo);
	}
};
