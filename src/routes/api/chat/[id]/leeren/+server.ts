import { apiCall } from '#lib/server/api.ts';
import { clearChat } from '#lib/server/chat.ts';
import type { RequestHandler } from './$types';

/** Einzelchat nur für mich löschen. */
export const POST: RequestHandler = async ({ params, locals }) =>
	apiCall(async () => {
		await clearChat(Number(params.id), locals.user!);
		return { ok: true };
	});
