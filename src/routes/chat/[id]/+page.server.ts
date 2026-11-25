import {
	chatHeader,
	chatPeople,
	getPins,
	isMuted,
	lastReadId,
	loadMessages,
	requireChat,
	retentionFor
} from '#lib/server/chat.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const { chat, write } = await requireChat(Number(params.id), user);
	const { messages, more } = await loadMessages(chat.id, user.id);
	return {
		chat: { id: chat.id, kind: chat.kind },
		header: await chatHeader(chat, user),
		people: (await chatPeople(chat)).map((p) => ({ id: p.id, name: p.name })),
		messages,
		more,
		lastRead: await lastReadId(chat.id, user.id),
		write,
		muted: await isMuted(user.id, chat.id),
		pins: await getPins(chat.id, user.id),
		retention: await retentionFor(user),
		me: { id: user.id, isAdmin: user.role === 'admin' }
	};
};
