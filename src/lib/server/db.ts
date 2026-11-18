import { building } from '$app/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './config.ts';
import * as schema from './schema.ts';

// Während des Builds analysiert SvelteKit die Module, ohne dass eine Datenbank
// existiert. postgres() verbindet erst bei der ersten Abfrage.
const client = postgres(building ? 'postgres://build@localhost/build' : config.databaseUrl);

export const db = drizzle(client, { schema });

/** Schliesst die Verbindungen beim Herunterfahren. */
export const closeDb = () => client.end({ timeout: 5 });
export { schema };
