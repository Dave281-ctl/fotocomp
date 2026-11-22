import { count, sum } from 'drizzle-orm';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { feedback, photos, themes, users } from '#lib/server/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [u] = await db.select({ n: count() }).from(users);
	const [p] = await db.select({ n: count(), bytes: sum(photos.sizeBytes) }).from(photos);
	const [t] = await db.select({ n: count() }).from(themes);
	const [f] = await db.select({ n: count() }).from(feedback);
	return {
		version: config.version,
		stats: [
			{ label: 'Benutzer', value: u.n },
			{ label: 'Fotos', value: p.n },
			{ label: 'Speicher (Originale)', value: `${(Number(p.bytes ?? 0) / 1e9).toFixed(2)} GB` },
			{ label: 'Themen', value: t.n },
			{ label: 'Feedbacks', value: f.n }
		]
	};
};
