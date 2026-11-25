import { redirect } from '@sveltejs/kit';
import { helpChat } from '#lib/server/chat.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => redirect(303, `/chat/${(await helpChat()).id}`);
