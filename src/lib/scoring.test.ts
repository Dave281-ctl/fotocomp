import { describe, expect, it } from 'vitest';
import {
	dailyWinners,
	rankDaily,
	rankPhotographers,
	rankWeekly,
	weeklyWinners
} from './scoring.ts';

describe('rankDaily', () => {
	it('sortiert nach Durchschnitt', () => {
		const r = rankDaily([
			{ photoId: 1, stars: [3, 4] },
			{ photoId: 2, stars: [5, 5, 4] },
			{ photoId: 3, stars: [2] }
		]);
		expect(r.map((x) => [x.photoId, x.rank, x.average])).toEqual([
			[2, 1, 4.67],
			[1, 2, 3.5],
			[3, 3, 2]
		]);
	});

	it('Gleichstand teilt den Rang, mehr Stimmen gewinnen', () => {
		const r = rankDaily([
			{ photoId: 1, stars: [4, 4] },
			{ photoId: 2, stars: [4, 4] },
			{ photoId: 3, stars: [4] },
			{ photoId: 4, stars: [5, 3] }
		]);
		expect(r.map((x) => [x.photoId, x.rank])).toEqual([
			[1, 1],
			[2, 1],
			[4, 1],
			[3, 4]
		]);
	});

	it('Fotos ohne Stimmen landen am Schluss', () => {
		const r = rankDaily([
			{ photoId: 1, stars: [] },
			{ photoId: 2, stars: [1] }
		]);
		expect(r.map((x) => [x.photoId, x.rank, x.votes])).toEqual([
			[2, 1, 1],
			[1, 2, 0]
		]);
	});
});

describe('rankWeekly', () => {
	it('summiert Punkte und zählt bei Gleichstand die ersten Plätze', () => {
		const r = rankWeekly(
			[
				{ photoId: 1, points: 3 },
				{ photoId: 2, points: 2 },
				{ photoId: 2, points: 1 },
				{ photoId: 3, points: 1 }
			],
			[1, 2, 3, 4]
		);
		expect(r.map((x) => [x.photoId, x.points, x.rank])).toEqual([
			[1, 3, 1],
			[2, 3, 2],
			[3, 1, 3],
			[4, 0, 4]
		]);
	});
});

describe('rankPhotographers', () => {
	it('summiert die Tagesdurchschnitte', () => {
		const r = rankPhotographers([
			{ userId: 1, average: 4 },
			{ userId: 1, average: 3.5 },
			{ userId: 2, average: 4.5 }
		]);
		expect(r.map((x) => [x.userId, x.total, x.rank])).toEqual([
			[1, 7.5, 1],
			[2, 4.5, 2]
		]);
	});
});

describe('Sieger über mehrere Tage und Themen', () => {
	it('ermittelt pro Thema und Tag den Tagessieg, Gleichstand zählt doppelt', () => {
		const winners = dailyWinners([
			{ photoId: 1, group: '1:2026-11-18', votes: 2, sum: 9 }, // 4.5
			{ photoId: 2, group: '1:2026-11-18', votes: 2, sum: 8 },
			{ photoId: 3, group: '2:2026-11-18', votes: 2, sum: 6 }, // 3.0, anderes Thema
			{ photoId: 4, group: '1:2026-11-19', votes: 2, sum: 10 },
			{ photoId: 5, group: '1:2026-11-19', votes: 2, sum: 10 }
		]);
		expect(winners.sort()).toEqual([1, 3, 4, 5]);
	});

	it('bei gleichem Schnitt gewinnt, wer mehr Stimmen hat', () => {
		const winners = dailyWinners([
			{ photoId: 1, group: 'a', votes: 1, sum: 5 },
			{ photoId: 2, group: 'a', votes: 3, sum: 15 }
		]);
		expect(winners).toEqual([2]);
	});

	it('ohne Stimmen oder Punkte gibt es keinen Sieger', () => {
		expect(dailyWinners([{ photoId: 1, group: 'a', votes: 0, sum: 0 }])).toEqual([]);
		expect(weeklyWinners([{ photoId: 1, group: 'w', points: 0, firsts: 0 }])).toEqual([]);
	});

	it('Wochenfoto nach Punkten, dann nach Erstplatzierungen', () => {
		const winners = weeklyWinners([
			{ photoId: 1, group: 'w', points: 6, firsts: 1 },
			{ photoId: 2, group: 'w', points: 6, firsts: 2 },
			{ photoId: 3, group: 'v', points: 1, firsts: 0 }
		]);
		expect(winners.sort()).toEqual([2, 3]);
	});
});
