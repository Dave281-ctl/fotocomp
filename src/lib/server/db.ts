import { building } from '$app/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { connect } from '../../../scripts/db-connection.js';
import * as schema from './schema.ts';

// Während des Builds analysiert SvelteKit die Module, ohne dass eine Datenbank
// existiert. postgres() verbindet erst bei der ersten Abfrage.
const client = building ? postgres('postgres://build@localhost/build') : connect();

export const db = drizzle(client, { schema });

/** Schliesst die Verbindungen beim Herunterfahren. */
export const closeDb = () => client.end({ timeout: 5 });
export { schema };
