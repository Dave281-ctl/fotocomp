import { json } from '@sveltejs/kit';
import { markRead, requireChat } from '#lib/server/chat.ts';
import type { RequestHandler } from './$types';

/** Gelesen bis { lastId } (nur für die eigenen Zähler, keine Lesebestätigung). */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user!;
	const { chat } = await requireChat(Number(params.id), user);
	const { lastId } = await request.json().catch(() => ({}));
	if (Number.isInteger(lastId) && lastId > 0) await markRead(chat.id, user.id, lastId);
	return json({ ok: true });
};
