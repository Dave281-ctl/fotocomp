import { describe, expect, it } from 'vitest';
import { iosBrowser } from './push-client.ts';

const base =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';

describe('Browser auf dem iPhone', () => {
	it('erkennt Safari', () => {
		expect(iosBrowser(`${base} Version/18.1 Mobile/15E148 Safari/604.1`)).toEqual({
			safari: true,
			name: 'Safari'
		});
	});
	it('erkennt Chrome, Firefox und eingebaute Browser', () => {
		expect(iosBrowser(`${base} CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1`).name).toBe(
			'Chrome'
		);
		expect(iosBrowser(`${base} FxiOS/133.0 Mobile/15E148 Safari/605.1.15`).name).toBe('Firefox');
		expect(iosBrowser(`${base} Mobile/15E148 Instagram 360.0.0.0`).name).toBe('Instagram');
		expect(iosBrowser(`${base} Mobile/15E148 [FBAN/FBIOS;FBAV/490.0]`).safari).toBe(false);
	});
});
