import { apiCall } from '#lib/server/api.ts';
import { pinMessage } from '#lib/server/chat.ts';
import type { RequestHandler } from './$types';

/** Für alle oben anheften: { hours: 1 | 12 | 24 | 72 }, lösen: { hours: 0 }. */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { hours } = await request.json().catch(() => ({}));
	return apiCall(() => pinMessage(Number(params.mid), locals.user!, Number(hours) || 0));
};
