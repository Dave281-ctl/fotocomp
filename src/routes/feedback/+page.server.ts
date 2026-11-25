import { redirect } from '@sveltejs/kit';
import { getMemberships } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

/** Alte Adresse (z.B. aus früheren Mails): weiter zur Feedback-Runde im Thema. */
export const load: PageServerLoad = async ({ locals, url }) => {
	const id =
		Number(url.searchParams.get('thema')) || (await getMemberships(locals.user!.id))[0]?.theme.id;
	redirect(301, id ? `/themen/${id}/feedback` : '/themen');
};
