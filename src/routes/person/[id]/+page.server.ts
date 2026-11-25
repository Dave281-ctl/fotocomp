import { error } from '@sveltejs/kit';
import { getPerson } from '#lib/server/person.ts';
import { now } from '#lib/server/time.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const data = await getPerson(Number(params.id), locals.user!.id, now());
	if (!data) error(404, 'Person nicht gefunden');
	return { ...data, isMe: data.person.id === locals.user!.id };
};
