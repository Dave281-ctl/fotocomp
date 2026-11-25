import { describe, expect, it } from 'vitest';
import { cameraStats } from './camera-stats.ts';

describe('Kamerastatistik', () => {
	it('zählt Kameras, die häufigste zuerst, ohne Daten als «Unbekannt»', () => {
		const s = cameraStats([
			{ make: 'FUJIFILM', model: 'X-T5', lens: 'XF16-55mm', focalLength: 23, aperture: 5.6 },
			{ make: 'FUJIFILM', model: 'X-T5', lens: 'XF16-55mm', focalLength: 23.2, aperture: 8 },
			{ make: 'Apple', model: 'iPhone 15 Pro', lens: 'iPhone 15 Pro back camera', aperture: 1.78 },
			{}
		]);
		expect(s.cameras).toEqual([
			{ name: 'FUJIFILM X-T5', photos: 2 },
			{ name: 'Apple iPhone 15 Pro', photos: 1 },
			{ name: 'Unbekannt', photos: 1 }
		]);
		expect(s.lens).toBe('XF16-55mm'); // iPhone-«Objektiv» zählt nicht
		expect(s.focalLength).toBe(23);
	});
});
