import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';

/** Für den Docker-Healthcheck: App und Datenbank erreichbar? */
export const GET = async () => {
	await db.execute(sql`select 1`);
	return new Response('ok');
};
