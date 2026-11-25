import { desc } from 'drizzle-orm';
import { themePhase } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { themes } from '#lib/server/schema.ts';
import { themeTabs } from '#lib/server/theme-tabs.ts';
import { now } from '#lib/server/time.ts';
import { canCreateTheme, memberCount } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const t = now();
	const tabs = await themeTabs(user, t);
	const mine = new Set(tabs.map((tab) => tab.id));
	const all = await db.select().from(themes).orderBy(desc(themes.startDate));
	const list = await Promise.all(
		all.map(async (theme) => ({
			id: theme.id,
			title: theme.title,
			description: theme.description,
			startDate: theme.startDate,
			endDate: theme.endDate,
			phase: themePhase(theme, t).kind,
			members: await memberCount(theme.id),
			mine: mine.has(theme.id)
		}))
	);
	return {
		tabs,
		// Eigene zuerst, dann laufende, dann bald startende
		open: list
			.filter((x) => x.phase !== 'ended')
			.sort(
				(a, b) =>
					Number(b.mine) - Number(a.mine) ||
					Number(a.phase === 'upcoming') - Number(b.phase === 'upcoming')
			),
		past: list.filter((x) => x.phase === 'ended'),
		canCreate: await canCreateTheme(user)
	};
};
