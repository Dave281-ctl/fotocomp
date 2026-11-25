import { json } from '@sveltejs/kit';
import { unreadTotal } from '#lib/server/chat.ts';
import type { RequestHandler } from './$types';

/** Zähler im Menü. */
export const GET: RequestHandler = async ({ locals }) =>
	json({ unread: await unreadTotal(locals.user!) });
