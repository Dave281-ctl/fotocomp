/**
 * Neuigkeiten auf «Heute» sollen motivieren, aber nicht ewig stehen bleiben:
 * Jede wird höchstens zweimal gezeigt (ein Besuch zählt höchstens alle
 * 10 Minuten) oder verschwindet sofort, wenn man sie antippt.
 */
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from './db.ts';
import { newsViews } from './schema.ts';

export const MAX_VIEWS = 2;
const VISIT_GAP_MS = 10 * 60 * 1000;

/** Welche dieser Neuigkeiten hat die Person schon oft genug gesehen? */
export async function seenEnough(userId: number, keys: string[]) {
	if (keys.length === 0) return new Set<string>();
	const rows = await db
		.select({ key: newsViews.key, views: newsViews.views })
		.from(newsViews)
		.where(and(eq(newsViews.userId, userId), inArray(newsViews.key, keys)));
	return new Set(rows.filter((r) => r.views >= MAX_VIEWS).map((r) => r.key));
}

/** Ein Besuch von «Heute»: die gezeigten Neuigkeiten zählen (höchstens alle 10 Minuten). */
export async function countViews(userId: number, keys: string[], t = new Date()) {
	if (keys.length === 0) return;
	// In handgeschriebenem SQL braucht der Treiber Text statt Date
	const gap = new Date(t.getTime() - VISIT_GAP_MS).toISOString();
	const now = t.toISOString();
	await db
		.insert(newsViews)
		.values(keys.map((key) => ({ userId, key, views: 1, lastAt: t })))
		.onConflictDoUpdate({
			target: [newsViews.userId, newsViews.key],
			// Nur zählen, wenn der letzte gezählte Besuch über 10 Minuten her ist
			set: {
				views: sql`case when ${newsViews.lastAt} < ${gap}::timestamptz then ${newsViews.views} + 1 else ${newsViews.views} end`,
				lastAt: sql`case when ${newsViews.lastAt} < ${gap}::timestamptz then ${now}::timestamptz else ${newsViews.lastAt} end`
			}
		});
}

/** Angetippt: gilt als gesehen. */
export async function markSeen(userId: number, key: string, t = new Date()) {
	await db
		.insert(newsViews)
		.values({ userId, key, views: MAX_VIEWS, lastAt: t })
		.onConflictDoUpdate({
			target: [newsViews.userId, newsViews.key],
			set: { views: MAX_VIEWS, lastAt: t }
		});
}

/** Alte Einträge aufräumen (Neuigkeiten sind nach 3 Tagen ohnehin weg). */
export async function purgeNewsViews(t = new Date()) {
	await db.delete(newsViews).where(lt(newsViews.lastAt, new Date(t.getTime() - 30 * 86_400_000)));
}
