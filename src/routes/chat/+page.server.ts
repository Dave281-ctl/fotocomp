import { listChats } from '#lib/server/chat.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	chats: await listChats(locals.user!)
});
