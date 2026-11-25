import { apiCall } from '#lib/server/api.ts';
import { loadMessages, requireChat, sendMessage } from '#lib/server/chat.ts';
import { UserError } from '#lib/server/errors.ts';
import type { RequestHandler } from './$types';

/** Ältere Nachrichten nachladen: ?vor=<id> */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const { chat } = await requireChat(Number(params.id), locals.user!);
	return apiCall(() =>
		loadMessages(chat.id, locals.user!.id, Number(url.searchParams.get('vor')) || undefined)
	);
};

/** Senden: { body, replyToId, mentionIds } */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user!;
	const { chat, write } = await requireChat(Number(params.id), user);
	return apiCall(async () => {
		if (!write) throw new UserError('In diesem Chat kann nicht mehr geschrieben werden.', 403);
		const input = await request.json().catch(() => ({}));
		return sendMessage(chat, user, {
			body: String(input.body ?? ''),
			replyToId: Number(input.replyToId) || null,
			mentionIds: Array.isArray(input.mentionIds) ? input.mentionIds.map(Number) : []
		});
	});
};
