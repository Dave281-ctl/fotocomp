/**
 * Titelbilder für Themen (Design Ben-FINAL): das bestbewertete Foto des
 * jüngsten enthüllten Tags. Fotos des laufenden Tags bleiben verborgen.
 */
import { sql } from 'drizzle-orm';
import { addDays, gameDay } from '../schedule.ts';
import { db } from './db.ts';

/**
 * Titelbild pro Thema (Foto-ID): aus Tagen vor heute; gibt es noch keins,
 * ersatzweise das eigene Foto des Betrachters (das darf er immer sehen).
 */
export async function themeCovers(
	themeIds: number[],
	viewerId: number,
	now: Date
): Promise<Map<number, number>> {
	if (themeIds.length === 0) return new Map();
	const lastDay = addDays(gameDay(now), -1);
	const rows = await db.execute<{ theme_id: number; photo_id: number }>(sql`
		select distinct on (p.theme_id) p.theme_id, p.id as photo_id
		from photos p
		left join votes v on v.photo_id = p.id
		where p.theme_id in ${sql.raw(`(${themeIds.filter(Number.isInteger).join(',')})`)}
			and (p.day <= ${lastDay} or p.user_id = ${viewerId})
		group by p.id
		order by p.theme_id, (p.day <= ${lastDay}) desc, p.day desc, avg(v.stars) desc nulls last, count(v.stars) desc, p.id
	`);
	return new Map(rows.map((r) => [Number(r.theme_id), Number(r.photo_id)]));
}
