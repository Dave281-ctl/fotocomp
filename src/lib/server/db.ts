import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './config.ts';
import * as schema from './schema.ts';

const client = postgres(config.databaseUrl);

export const db = drizzle(client, { schema });
export { schema };
