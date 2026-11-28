import { fail, redirect } from '@sveltejs/kit';
import { themePhase } from '#lib/schedule.ts';
import { getThemeGallery } from '#lib/server/theme-gallery.ts';
import { themeTasks } from '#lib/server/theme-status.ts';
import { themeTabs } from '#lib/server/theme-tabs.ts';
import { chatUnread, themeChat } from '#lib/server/chat.ts';
import { themeCovers } from '#lib/server/covers.ts';
import { now } from '#lib/server/time.ts';
import { uploaders } from '#lib/server/today.ts';
import {
	getMembership,
	getPhase,
	getTheme,
	joinTheme,
	leaveTheme,
	listMembers
} from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const t = now();
	const theme = await getTheme(Number(params.id));
	const mine = !!(await getMembership(user.id, theme.id));
	const chat = mine ? await themeChat(theme.id) : null;
	const phase = await getPhase(theme, t);
	return {
		cover: (await themeCovers([theme.id], user.id, t)).get(theme.id) ?? null,
		// «Wer hat schon» für das Foto des Tages
		who: mine && phase.kind === 'upload' ? await uploaders(theme.id, phase.day, user.id) : null,
		// Am Handy hat das Thema eine eigene Kopfzeile auf dem Titelbild (siehe Nav)
		header: 'hidden' as const,
		chat: chat ? { id: chat.id, unread: await chatUnread(user, chat.id) } : null,
		tabs: await themeTabs(user, t),
		tasks: mine ? await themeTasks(theme, user, t) : [],
		members: await listMembers(theme.id),
		gallery: await getThemeGallery(theme, user.id, t)
	};
};

export const actions: Actions = {
	leave: async ({ params, locals }) => {
		await leaveTheme(Number(params.id), locals.user!.id);
		redirect(303, '/themen');
	},
	join: async ({ params, locals }) => {
		const theme = await getTheme(Number(params.id));
		if (themePhase(theme, now()).kind === 'ended') return fail(400);
		await joinTheme(theme.id, locals.user!.id);
	}
};
