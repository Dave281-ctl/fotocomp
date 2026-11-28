import { listChats } from '#lib/server/chat.ts';
import { themeCovers } from '#lib/server/covers.ts';
import { now } from '#lib/server/time.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const chats = await listChats(locals.user!);
	// Bild für Themen-Gruppen: Titelbild des Themas
	const themeIds = chats.flatMap((c) => (c.themeId ? [c.themeId] : []));
	const covers = await themeCovers(themeIds, locals.user!.id, now());
	return { chats, covers: Object.fromEntries(covers) as Record<number, number> };
};
