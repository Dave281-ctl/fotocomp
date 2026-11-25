/**
 * Regeln der Galerie («Wow-Galerie»): Welche Fotos kommen hinein und in
 * welcher Reihenfolge? Reine Funktionen, damit sie testbar bleiben.
 */
import { addDays, isoWeekday, type Day } from './schedule.ts';

/** Ab so vielen Sternen im Schnitt (und mind. 2 Stimmen) zählt ein Foto zu den schönsten. */
export const WOW_MIN_STARS = 4;
export const WOW_MIN_VOTES = 2;

interface Rated {
	day: Day;
	badge: 'day' | 'week' | null;
	average: number | null;
	votes: number | null;
}

/** Wochenfotos, Tagessieger und alles ab 4 Sternen. */
export function isWow(p: Rated) {
	return p.badge !== null || ((p.average ?? 0) >= WOW_MIN_STARS && (p.votes ?? 0) >= WOW_MIN_VOTES);
}

/** Montag der Woche, in der das Foto entstand. */
export function weekStart(day: Day): Day {
	return addDays(day, 1 - isoWeekday(day));
}

const badgeOrder = (p: Rated) => (p.badge === 'week' ? 0 : p.badge === 'day' ? 1 : 2);

/** Schönste zuerst: Wochenfoto, Tagessieger, dann nach Sternen; bei Gleichstand das neuere. */
export function wowOrder(a: Rated, b: Rated) {
	return (
		badgeOrder(a) - badgeOrder(b) ||
		(b.average ?? 0) - (a.average ?? 0) ||
		b.day.localeCompare(a.day)
	);
}

/** Nach Woche gruppiert, neueste Woche zuerst, innerhalb der Woche die schönsten zuerst. */
export function groupByWeek<T extends Rated>(photos: T[]) {
	const weeks = Map.groupBy(photos, (p) => weekStart(p.day));
	return [...weeks.entries()]
		.sort(([a], [b]) => b.localeCompare(a))
		.map(([week, list]) => ({ week, photos: list.sort(wowOrder) }));
}
