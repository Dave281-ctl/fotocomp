import { json } from '@sveltejs/kit';
import { requireChat, setMute } from '#lib/server/chat.ts';
import type { RequestHandler } from './$types';

/** Stummschalten: { hours } – 8, 168, null (immer) oder 0 (wieder einschalten). */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user!;
	const { chat } = await requireChat(Number(params.id), user);
	const { hours } = await request.json().catch(() => ({}));
	const value = hours === null ? null : [0, 8, 168].includes(hours) ? hours : 0;
	await setMute(chat.id, user.id, value);
	return json({ ok: true });
};
