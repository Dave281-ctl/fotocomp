import { describe, expect, it } from 'vitest';
import { rankDaily, rankPhotographers, rankWeekly } from './scoring.ts';

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
