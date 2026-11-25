import { apiCall } from '#lib/server/api.ts';
import { deleteMessage, react } from '#lib/server/chat.ts';
import type { RequestHandler } from './$types';

/** Reaktion: { emoji } – gleiches Emoji oder null entfernt sie. */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { emoji } = await request.json().catch(() => ({}));
	return apiCall(() =>
		react(Number(params.mid), locals.user!, typeof emoji === 'string' ? emoji : null)
	);
};

export const DELETE: RequestHandler = async ({ params, locals }) =>
	apiCall(() => deleteMessage(Number(params.mid), locals.user!));
