import { eq } from 'drizzle-orm';
import { db } from './db.ts';
import { settings } from './schema.ts';
import type { UpdatePolicy } from './version.ts';

/** Einstellungen, die der Admin ändern kann, mit ihren Standardwerten. */
const defaults = {
	/** 'open' = jeder darf sich registrieren, 'invite' = nur mit Einladung. */
	registration: 'open' as 'open' | 'invite',
	/** 'admins' = nur Admins erstellen Themen, 'all' = alle User. */
	themeCreation: 'admins' as 'admins' | 'all',
	/** Welche Updates die App selbst installiert (siehe version.ts). */
	updatePolicy: 'all' as UpdatePolicy
};

export type Settings = typeof defaults;

export async function getSettings(): Promise<Settings> {
	const rows = await db.select().from(settings);
	const result = { ...defaults };
	for (const { key, value } of rows) {
		if (key in result) (result as Record<string, string>)[key] = value;
	}
	return result;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
	await db
		.insert(settings)
		.values({ key, value })
		.onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function deleteSetting(key: keyof Settings) {
	await db.delete(settings).where(eq(settings.key, key));
}
