import { sql } from 'drizzle-orm';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';

/** Für den Docker-Healthcheck: App und Datenbank erreichbar? Nennt auch die Version. */
export const GET = async () => {
	await db.execute(sql`select 1`);
	return new Response('ok', {
		headers: { 'x-fotocomp-version': config.version, 'cache-control': 'no-store' }
	});
};
