import { redirect } from '@sveltejs/kit';
import { formatDay, gameDay, isThemeOpen, themePhase } from '#lib/schedule.ts';
import { themeNews, themeTasks } from '#lib/server/theme-status.ts';
import { now } from '#lib/server/time.ts';
import { getMemberships } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Alte Links (z.B. aus früheren Mails): /?thema=3 → zum Thema
	const old = Number(url.searchParams.get('thema'));
	if (old) redirect(301, `/themen/${old}`);

	const user = locals.user!;
	const t = now();
	const memberships = await getMemberships(user.id);

	const groups = await Promise.all(
		memberships.map(async ({ theme }) => {
			const phase = themePhase(theme, t);
			const tasks = await themeTasks(theme, user, t);
			const news = await themeNews(theme, user, t, user.newsSeenAt);
			const open = tasks.filter((task) => !task.done);
			return {
				theme: { id: theme.id, title: theme.title },
				upcoming: phase.kind === 'upcoming' ? formatDay(theme.startDate) : null,
				tasks,
				news,
				open: open.length,
				// Sortierung: dringendste offene Aufgabe, sonst neueste Neuigkeit
				due: Math.min(...open.map((task) => task.due?.getTime() ?? Infinity)),
				latest: news[0]?.at.getTime() ?? 0
			};
		})
	);

	const rank = (g: (typeof groups)[number]) => (g.open ? 0 : g.news.length ? 1 : 2);
	groups.sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.due - b.due : b.latest - a.latest));

	return {
		day: formatDay(gameDay(t)),
		groups,
		openTotal: groups.reduce((n, g) => n + g.open, 0),
		hasThemes: memberships.some(({ theme }) => isThemeOpen(theme, t)),
		seenAt: t.toISOString()
	};
};
