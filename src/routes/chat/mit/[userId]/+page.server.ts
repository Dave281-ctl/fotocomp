import { error, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { directChat } from '#lib/server/chat.ts';
import { db } from '#lib/server/db.ts';
import { users } from '#lib/server/schema.ts';
import type { PageServerLoad } from './$types';

/** Einzelchat mit einer Person öffnen (wird beim ersten Mal angelegt). */
export const load: PageServerLoad = async ({ params, locals }) => {
	const me = locals.user!;
	const id = Number(params.userId);
	const [other] = Number.isInteger(id)
		? await db
				.select({ id: users.id })
				.from(users)
				.where(and(eq(users.id, id), eq(users.disabled, false)))
		: [];
	if (!other || other.id === me.id) error(404, 'Person nicht gefunden');
	redirect(303, `/chat/${(await directChat(me.id, other.id)).id}`);
};
