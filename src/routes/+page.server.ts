import { redirect } from '@sveltejs/kit';
import { formatDay, formatWhen, gameDay, isThemeOpen, themePhase } from '#lib/schedule.ts';
import { chatExcerpt } from '#lib/chat-rules.ts';
import { recentMentions } from '#lib/server/chat.ts';
import { seenEnough } from '#lib/server/news-views.ts';
import { NEWS_DAYS, themeNews, themeTasks } from '#lib/server/theme-status.ts';
import type { NewsItem } from '#lib/types.ts';
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

	// Erwähnungen im Chat: in Themen-Chats beim Thema, sonst in einer eigenen Karte
	const mentions = await recentMentions(user, new Date(t.getTime() - NEWS_DAYS * 86_400_000));
	const chatNews: NewsItem[] = [];
	for (const m of mentions) {
		const item: NewsItem = {
			key: `mention:${m.messageId}`,
			kind: 'mention',
			at: m.at,
			when: formatWhen(m.at, t),
			title: `${m.author} hat dich erwähnt`,
			text: chatExcerpt(m.body, 90),
			photoId: null,
			href: `/chat/${m.chatId}#m-${m.messageId}`,
			isNew: !user.newsSeenAt || m.at > user.newsSeenAt
		};
		const group = m.kind === 'theme' ? groups.find((g) => g.theme.id === m.themeId) : undefined;
		if (group) {
			group.news.push(item);
			group.news.sort((a, b) => b.at.getTime() - a.at.getTime());
			group.latest = Math.max(group.latest, m.at.getTime());
		} else chatNews.push(item);
	}

	// Neuigkeiten, die schon zweimal gezeigt oder angetippt wurden, ausblenden
	const hidden = await seenEnough(user.id, [
		...groups.flatMap((g) => g.news.map((n) => n.key)),
		...chatNews.map((n) => n.key)
	]);
	for (const g of groups) {
		g.news = g.news.filter((n) => !hidden.has(n.key));
		g.latest = g.news[0]?.at.getTime() ?? 0;
	}
	const visibleChatNews = chatNews.filter((n) => !hidden.has(n.key));

	// Offene Aufgaben zuerst, dann Neuigkeiten, dann nur Erledigtes, dann ruhige Themen
	const rank = (g: (typeof groups)[number]) =>
		g.open ? 0 : g.news.length ? 1 : g.tasks.length ? 2 : 3;
	groups.sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.due - b.due : b.latest - a.latest));

	return {
		day: formatDay(gameDay(t)),
		groups,
		chatNews: visibleChatNews,
		openTotal: groups.reduce((n, g) => n + g.open, 0),
		hasThemes: memberships.some(({ theme }) => isThemeOpen(theme, t)),
		seenAt: t.toISOString()
	};
};
