import { describe, expect, it } from 'vitest';
import { groupByWeek, isWow, weekStart } from './wow.ts';

const p = (
	day: string,
	average: number | null,
	badge: 'day' | 'week' | null = null,
	votes = 3
) => ({
	day,
	average,
	badge,
	votes
});

describe('Wow-Galerie', () => {
	it('nimmt Sieger und Fotos ab 4 Sternen', () => {
		expect(isWow(p('2026-11-20', 3.2, 'day'))).toBe(true);
		expect(isWow(p('2026-11-20', 4.0))).toBe(true);
		expect(isWow(p('2026-11-20', 3.9))).toBe(false);
		expect(isWow(p('2026-11-20', 5, null, 1))).toBe(false); // nur eine Stimme
	});

	it('beginnt die Woche am Montag', () => {
		expect(weekStart('2026-11-22')).toBe('2026-11-16'); // Sonntag
		expect(weekStart('2026-11-16')).toBe('2026-11-16');
	});

	it('neueste Woche zuerst, darin Wochenfoto, Tagessieger, dann nach Sternen', () => {
		const weeks = groupByWeek([
			p('2026-11-17', 4.5),
			p('2026-11-18', 3.5, 'day'),
			p('2026-11-24', 4.2),
			p('2026-11-19', 4.0, 'week'),
			p('2026-11-20', 4.8)
		]);
		expect(weeks.map((w) => w.week)).toEqual(['2026-11-23', '2026-11-16']);
		expect(weeks[1].photos.map((x) => x.day)).toEqual([
			'2026-11-19',
			'2026-11-18',
			'2026-11-20',
			'2026-11-17'
		]);
	});
});
