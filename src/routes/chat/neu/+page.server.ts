import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { users } from '#lib/server/schema.ts';
import type { PageServerLoad } from './$types';

/** Personensuche für einen neuen Einzelchat. */
export const load: PageServerLoad = async ({ locals }) => ({
	people: await db
		.select({ id: users.id, name: users.name })
		.from(users)
		.where(and(ne(users.id, locals.user!.id), eq(users.disabled, false)))
		.orderBy(asc(users.name))
});
