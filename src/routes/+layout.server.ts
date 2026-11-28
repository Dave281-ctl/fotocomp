import { redirect } from '@sveltejs/kit';
import { unreadTotal } from '#lib/server/chat.ts';
import { config } from '#lib/server/config.ts';
import { openTaskCount } from '#lib/server/theme-status.ts';
import { now } from '#lib/server/time.ts';
import { vapidPublicKey } from '#lib/server/push.ts';
import { REPO_URL } from '#lib/server/version.ts';
import { getMemberships } from '#lib/server/themes.ts';
import type { LayoutServerLoad } from './$types';

async function themesHref(userId: number) {
	const mine = await getMemberships(userId);
	return mine.length === 1 ? `/themen/${mine[0].theme.id}` : '/themen';
}

/** Seiten, die auch vor Abschluss der Einführung erreichbar sind. */
const BEFORE_ONBOARDING = ['/willkommen', '/abmelden'];

export const load: LayoutServerLoad = async ({ locals, url, depends }) => {
	// Nach dem Bewerten u.ä. lässt sich der Zähler gezielt neu laden: invalidate('app:todos')
	depends('app:todos');
	const user = locals.user;
	// Neue Benutzer sehen zuerst die Einführung.
	if (user && !user.onboardedAt && !BEFORE_ONBOARDING.some((p) => url.pathname.startsWith(p))) {
		redirect(303, '/willkommen');
	}
	return {
		user: user ? { id: user.id, name: user.name, role: user.role } : null,
		theme: locals.theme,
		version: config.version,
		channel: config.channel,
		pushKey: user ? await vapidPublicKey() : null,
		chatUnread: user ? await unreadTotal(user) : 0,
		// Offene Aufgaben (Hochladen, Bewerten …) für den Zähler bei «Heute»
		openTasks: user ? await openTaskCount(user, now()) : 0,
		// Genau ein Thema: Der Menüpunkt «Themen» führt direkt dorthin
		themesHref: user ? await themesHref(user.id) : '/themen',
		repoUrl: REPO_URL
	};
};
