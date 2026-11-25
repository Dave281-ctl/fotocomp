import { apiCall } from '#lib/server/api.ts';
import { setFavorite } from '#lib/server/chat.ts';
import type { RequestHandler } from './$types';

/** Chat oben anheften: { on: true | false } – höchstens 3. */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { on } = await request.json().catch(() => ({}));
	return apiCall(async () => {
		await setFavorite(Number(params.id), locals.user!, on === true);
		return { ok: true };
	});
};
