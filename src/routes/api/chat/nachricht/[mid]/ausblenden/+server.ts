import { apiCall } from '#lib/server/api.ts';
import { hideMessage } from '#lib/server/chat.ts';
import type { RequestHandler } from './$types';

/** Nachricht nur für mich löschen. */
export const POST: RequestHandler = async ({ params, locals }) =>
	apiCall(() => hideMessage(Number(params.mid), locals.user!));
