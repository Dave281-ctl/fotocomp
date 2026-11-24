/**
 * Installierte und neueste Version. Die neueste wird bei GitHub abgefragt
 * (öffentlich, ohne Anmeldung) und eine Stunde zwischengespeichert.
 * Ist GitHub nicht erreichbar, bleibt sie einfach leer.
 */
import { config } from './config.ts';

export const REPO = 'Dave281-ctl/fotocomp';
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;

const CACHE_MS = 60 * 60 * 1000;
let cache: { at: number; latest: string | null } | undefined;

async function latestRelease(): Promise<string | null> {
	if (cache && Date.now() - cache.at < CACHE_MS) return cache.latest;
	let latest: string | null = null;
	try {
		const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
			headers: { accept: 'application/vnd.github+json', 'user-agent': 'fotocomp' },
			signal: AbortSignal.timeout(3000)
		});
		if (res.ok) latest = ((await res.json()) as { tag_name?: string }).tag_name ?? null;
	} catch {
		// offline oder GitHub nicht erreichbar
	}
	cache = { at: Date.now(), latest };
	return latest;
}

/** «v0.3.1» → [0, 3, 1]; keine Versionsnummer → null */
function parse(version: string) {
	const m = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
	return m ? m.slice(1).map(Number) : null;
}

/** Ist `a` neuer als `b`? */
export function isNewer(a: string, b: string) {
	const x = parse(a);
	const y = parse(b);
	if (!x || !y) return false;
	for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
	return false;
}

/**
 * Welche Updates installiert die App selbst?
 * - all:    alle neuen Versionen
 * - major:  nur innerhalb der Hauptversion (bei v0.3.5 also v0.x.x)
 * - minor:  nur innerhalb der Nebenversion (bei v0.3.5 also v0.3.x)
 * - manual: keine, nur über den Knopf im Adminbereich
 */
export type UpdatePolicy = 'all' | 'major' | 'minor' | 'manual';
export const UPDATE_POLICIES: UpdatePolicy[] = ['all', 'major', 'minor', 'manual'];

/** Darf `latest` bei dieser Einstellung automatisch installiert werden? */
export function allowedByPolicy(latest: string, installed: string, policy: UpdatePolicy) {
	if (policy === 'manual' || !isNewer(latest, installed)) return false;
	const [a, b] = [parse(latest)!, parse(installed)!];
	if (policy === 'major') return a[0] === b[0];
	if (policy === 'minor') return a[0] === b[0] && a[1] === b[1];
	return true;
}

/** «v0.3.5» → { major: 'v0.x.x', minor: 'v0.3.x' } für die Beschriftung der Einstellung. */
export function policyRanges(installed: string) {
	const v = parse(installed);
	return v
		? { major: `v${v[0]}.x.x`, minor: `v${v[0]}.${v[1]}.x` }
		: { major: 'gleiche Hauptversion', minor: 'gleiche Nebenversion' };
}

export async function versionInfo() {
	const installed = config.version;
	const latest = await latestRelease();
	return {
		installed,
		latest,
		updateAvailable: !!latest && isNewer(latest, installed),
		releasesUrl: RELEASES_URL
	};
}
