/** Punkteberechnung für Tages- und Wochenbewertung (reine Funktionen). */

export interface Ranked {
	rank: number;
}

/**
 * Vergibt Ränge nach `score` (absteigend). Bei Gleichstand teilen sich
 * die Einträge den Rang, der nächste Rang wird übersprungen (1, 1, 3).
 */
export function assignRanks<T>(items: T[], score: (item: T) => number[]): (T & Ranked)[] {
	const keyed = items.map((item) => ({ item, key: score(item) }));
	keyed.sort((a, b) => compareKeys(b.key, a.key));
	let rank = 0;
	return keyed.map(({ item, key }, i) => {
		if (i === 0 || compareKeys(key, keyed[i - 1].key) !== 0) rank = i + 1;
		return { ...item, rank };
	});
}

function compareKeys(a: number[], b: number[]): number {
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
	return 0;
}

export interface DailyResult {
	photoId: number;
	average: number;
	votes: number;
}

/** Tagesresultat: Durchschnitt der Sterne, bei Gleichstand zählen mehr Stimmen. */
export function rankDaily(
	photos: { photoId: number; stars: number[] }[]
): (DailyResult & Ranked)[] {
	const results = photos.map(({ photoId, stars }) => ({
		photoId,
		votes: stars.length,
		average: stars.length ? round(stars.reduce((a, b) => a + b, 0) / stars.length) : 0
	}));
	return assignRanks(results, (r) => [r.average, r.votes]);
}

/** Wochenfoto: Summe der vergebenen Punkte (3/2/1), bei Gleichstand zählen mehr Erstplatzierungen. */
export function rankWeekly(
	votes: { photoId: number; points: number }[],
	photoIds: number[]
): { photoId: number; points: number; firsts: number; rank: number }[] {
	const totals = new Map(photoIds.map((id) => [id, { photoId: id, points: 0, firsts: 0 }]));
	for (const v of votes) {
		const t = totals.get(v.photoId);
		if (!t) continue;
		t.points += v.points;
		if (v.points === 3) t.firsts++;
	}
	return assignRanks([...totals.values()], (t) => [t.points, t.firsts]);
}

/** Wochenrangliste der Fotografen: Summe der Tagesdurchschnitte. */
export function rankPhotographers(
	daily: { userId: number; average: number }[]
): { userId: number; total: number; days: number; rank: number }[] {
	const totals = new Map<number, { userId: number; total: number; days: number }>();
	for (const d of daily) {
		const t = totals.get(d.userId) ?? { userId: d.userId, total: 0, days: 0 };
		t.total = round(t.total + d.average);
		t.days++;
		totals.set(d.userId, t);
	}
	return assignRanks([...totals.values()], (t) => [t.total, t.days]);
}

/** Ränge innerhalb jeder Gruppe (z.B. Thema + Tag); liefert die Erstplatzierten. */
function groupWinners<T extends { photoId: number; group: string }>(
	rows: T[],
	score: (row: T) => number[],
	counts: (row: T) => boolean
): number[] {
	const winners: number[] = [];
	for (const group of Map.groupBy(rows, (r) => r.group).values()) {
		for (const r of assignRanks(group, score)) {
			if (r.rank === 1 && counts(r)) winners.push(r.photoId);
		}
	}
	return winners;
}

/**
 * Tagessieger über viele Tage und Themen, aus Stimmen-Summen pro Foto.
 * Gleiche Regeln wie `rankDaily`; Fotos ohne Stimmen gewinnen nie.
 */
export function dailyWinners(
	rows: { photoId: number; group: string; votes: number; sum: number }[]
): number[] {
	const scored = rows.map((r) => ({ ...r, average: r.votes ? round(r.sum / r.votes) : 0 }));
	return groupWinners(
		scored,
		(r) => [r.average, r.votes],
		(r) => r.votes > 0
	);
}

/** Wochenfotos über viele Wochen und Themen. Gleiche Regeln wie `rankWeekly`. */
export function weeklyWinners(
	rows: { photoId: number; group: string; points: number; firsts: number }[]
): number[] {
	return groupWinners(
		rows,
		(r) => [r.points, r.firsts],
		(r) => r.points > 0
	);
}

const round = (n: number) => Math.round(n * 100) / 100;
