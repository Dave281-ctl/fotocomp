import { desc } from 'drizzle-orm';
import { themePhase } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { themes } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import { memberCount } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const t = now();
	const list = await db.select().from(themes).orderBy(desc(themes.startDate));
	return {
		themes: await Promise.all(
			list.map(async (theme) => ({
				...theme,
				phase: themePhase(theme, t).kind,
				members: await memberCount(theme.id)
			}))
		)
	};
};
