import { describe, expect, it } from 'vitest';
import { allowedByPolicy, isNewer, policyRanges } from './version.ts';

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

describe('allowedByPolicy', () => {
	it('alle: jede neuere Version', () => {
		expect(allowedByPolicy('v1.0.0', 'v0.3.5', 'all')).toBe(true);
		expect(allowedByPolicy('v0.3.5', 'v0.3.5', 'all')).toBe(false);
	});
	it('Hauptversion: bleibt bei v0', () => {
		expect(allowedByPolicy('v0.9.0', 'v0.3.5', 'major')).toBe(true);
		expect(allowedByPolicy('v1.0.0', 'v0.3.5', 'major')).toBe(false);
	});
	it('Nebenversion: bleibt bei v0.3', () => {
		expect(allowedByPolicy('v0.3.9', 'v0.3.5', 'minor')).toBe(true);
		expect(allowedByPolicy('v0.4.0', 'v0.3.5', 'minor')).toBe(false);
	});
	it('manuell und lokal «dev»: nie automatisch', () => {
		expect(allowedByPolicy('v0.3.6', 'v0.3.5', 'manual')).toBe(false);
		expect(allowedByPolicy('v0.3.6', 'dev', 'all')).toBe(false);
	});
	it('beschriftet die Bereiche nach der installierten Version', () => {
		expect(policyRanges('v0.3.5')).toEqual({ major: 'v0.x.x', minor: 'v0.3.x' });
	});
});

describe('Vorabversionen', () => {
	it('Beta ist älter als die stabile Version mit derselben Nummer', () => {
		expect(isNewer('v0.9.0', 'v0.9.0-beta.2')).toBe(true);
		expect(isNewer('v0.9.0-beta.2', 'v0.9.0-beta.1')).toBe(true);
		expect(isNewer('v0.9.0-beta.1', 'v0.8.7')).toBe(true);
		expect(isNewer('v0.9.0-beta.1', 'v0.9.0')).toBe(false);
	});
	it('Bereiche gelten auch für Vorabversionen', () => {
		expect(allowedByPolicy('v0.9.0-beta.1', 'v0.8.7', 'minor')).toBe(false);
		expect(allowedByPolicy('v0.9.0-beta.2', 'v0.9.0-beta.1', 'minor')).toBe(true);
	});
});
