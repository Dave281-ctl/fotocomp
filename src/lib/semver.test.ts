import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { compareVersions, isPrerelease, newestVersion } from '../../scripts/semver.js';

describe('Versionen mit Beta', () => {
	it('sortiert Vorabversionen vor die stabile Version', () => {
		const sorted = [
			'v0.9.1',
			'v0.9.0',
			'v0.9.0-beta.2',
			'v0.8.7',
			'v0.9.0-beta.10',
			'v0.9.0-beta.1'
		].sort(compareVersions);
		expect(sorted).toEqual([
			'v0.8.7',
			'v0.9.0-beta.1',
			'v0.9.0-beta.2',
			'v0.9.0-beta.10',
			'v0.9.0',
			'v0.9.1'
		]);
	});
	it('erkennt Vorabversionen und die neueste', () => {
		expect(isPrerelease('v0.9.0-beta.1')).toBe(true);
		expect(isPrerelease('v0.9.0')).toBe(false);
		expect(newestVersion(['v0.8.7', 'v0.9.0-beta.1'])).toBe('v0.9.0-beta.1');
		expect(newestVersion(['v0.8.7', 'v0.9.0-beta.1'], { stableOnly: true })).toBe('v0.8.7');
	});
});

describe('Image-Tags im Release-Workflow', () => {
	const channels = (version: string, existing: string[]) =>
		execFileSync('node', ['scripts/channels.js', version], { input: existing.join('\n') })
			.toString()
			.trim();
	it('Beta: nur «beta», nicht «latest»', () => {
		expect(channels('v0.9.0-beta.1', ['v0.8.7'])).toBe('latest=false\nbeta=true');
	});
	it('Stabil: «latest» und «beta»', () => {
		expect(channels('v0.9.0', ['v0.8.7', 'v0.9.0-beta.2'])).toBe('latest=true\nbeta=true');
	});
	it('Nachgereichte Korrektur auf älterer Linie: «latest», aber «beta» bleibt auf der neueren Beta', () => {
		expect(channels('v0.8.8', ['v0.8.7', 'v0.9.0-beta.2'])).toBe('latest=true\nbeta=false');
	});
});
