/**
 * Galerie eines Themas: zuoberst das Neueste (Siegertreppchen der Woche oder
 * des letzten Tages), darunter alle enthüllten Fotos, nach Tag gruppiert.
 */
import { and, desc, eq, lte } from 'drizzle-orm';
import {
	addDays,
	formatDay,
	formatShortDay,
	gameDay,
	lastRevealedDay,
	lastWeeklyVoteDay
} from '../schedule.ts';
import type { FeedPhoto } from '../types.ts';
import { db } from './db.ts';
import { decorate, getWinners, photoColumns } from './gallery.ts';
import { photos, users, type Theme } from './schema.ts';
import { getWeeklyResult } from './weekly.ts';

export type PodiumPhoto = FeedPhoto & { place: number; points?: number };

export interface Highlight {
	kind: 'week' | 'day';
	title: string;
	subtitle: string;
	photos: PodiumPhoto[];
}

/** Das Neueste im Thema als Treppchen. */
async function highlight(theme: Theme, viewerId: number, t: Date): Promise<Highlight | null> {
	const resultDay = lastRevealedDay(theme, t);
	const voteDay = lastWeeklyVoteDay(theme, t);

	if (voteDay && (!resultDay || voteDay > resultDay)) {
		const result = await getWeeklyResult(theme.id, voteDay, viewerId, t);
		if (result?.podium.length) {
			return {
				kind: 'week',
				title: 'Wochenfoto',
				subtitle: `${formatShortDay(addDays(voteDay, -6))} – ${formatShortDay(addDays(voteDay, -1))}`,
				photos: result.podium
			};
		}
	}
	if (resultDay) {
		const ranked = await dayPodium(theme.id, resultDay, viewerId, t);
		if (ranked.length) {
			return {
				kind: 'day',
				title: 'Tagesresultat',
				subtitle: formatDay(resultDay),
				photos: ranked
			};
		}
	}
	return null;
}

async function dayPodium(themeId: number, day: string, viewerId: number, t: Date) {
	const rows = await db
		.select(photoColumns)
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.where(and(eq(photos.themeId, themeId), eq(photos.day, day)));
	return (await decorate(rows, viewerId, t))
		.filter((p) => p.votes && p.rank && p.rank <= 3)
		.map((p) => ({ ...p, place: p.rank! }));
}

/** Alle enthüllten Fotos des Themas, neueste Tage zuerst. */
export async function getThemeGallery(theme: Theme, viewerId: number, t: Date) {
	const lastDay = addDays(gameDay(t), -1);
	const rows = await db
		.select(photoColumns)
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.where(and(eq(photos.themeId, theme.id), lte(photos.day, lastDay)))
		.orderBy(desc(photos.day));
	const badges = rows.length ? await getWinners(lastDay, t) : new Map();
	const decorated = (await decorate(rows, viewerId, t)).map((p) => ({
		...p,
		badge: badges.get(p.id) ?? null
	}));
	// Fotos auf dem Treppchen nicht nochmals unter «Alle Fotos» zeigen
	const top = await highlight(theme, viewerId, t);
	const onPodium = new Set(top?.photos.map((p) => p.id));
	const rest = decorated.filter((p) => !onPodium.has(p.id));
	const days = [...new Set(rest.map((p) => p.day))].sort().reverse();
	return {
		highlight: top,
		days: days.map((day) => ({ day, photos: rest.filter((p) => p.day === day) }))
	};
}
