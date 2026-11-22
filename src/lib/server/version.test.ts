import { describe, expect, it } from 'vitest';
import { isNewer } from './version.ts';

describe('isNewer', () => {
	it('vergleicht Versionsnummern', () => {
		expect(isNewer('v0.3.2', 'v0.3.1')).toBe(true);
		expect(isNewer('v0.10.0', 'v0.9.9')).toBe(true);
		expect(isNewer('v0.3.1', 'v0.3.1')).toBe(false);
		expect(isNewer('v0.3.0', 'v0.3.1')).toBe(false);
	});

	it('ohne Versionsnummer (lokal «dev») nie neuer', () => {
		expect(isNewer('v0.3.1', 'dev')).toBe(false);
	});
});
