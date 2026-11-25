/**
 * Installierte und neueste Version. Die neueste wird bei GitHub abgefragt
 * (öffentlich, ohne Anmeldung): einmal täglich in der Nacht und wenn der
 * Admin «Jetzt nach Updates suchen» drückt. Dazwischen gilt der letzte Stand.
 */
import { config } from './config.ts';

export const REPO = 'Dave281-ctl/fotocomp';
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;

/** Länger als einen Tag alt? Dann beim nächsten Aufruf neu fragen (z.B. nach einem Neustart). */
const CACHE_MS = 24 * 60 * 60 * 1000;
let cache: { at: Date; latest: string | null; failed: boolean } | undefined;

/** Neueste Version laut GitHub. `refresh`: auf jeden Fall jetzt nachfragen. */
async function latestRelease(refresh = false) {
	if (cache && !refresh && Date.now() - cache.at.getTime() < CACHE_MS) return cache;
	try {
		const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
			headers: { accept: 'application/vnd.github+json', 'user-agent': 'fotocomp' },
			signal: AbortSignal.timeout(5000)
		});
		if (!res.ok) throw new Error(`GitHub antwortet mit ${res.status}`);
		const latest = ((await res.json()) as { tag_name?: string }).tag_name ?? null;
		cache = { at: new Date(), latest, failed: false };
	} catch {
		// offline oder GitHub nicht erreichbar: den letzten bekannten Stand behalten
		cache = { at: new Date(), latest: cache?.latest ?? null, failed: true };
	}
	return cache;
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

export async function versionInfo(refresh = false) {
	const installed = config.version;
	const { latest, at, failed } = await latestRelease(refresh);
	return {
		installed,
		latest,
		checkedAt: at,
		checkFailed: failed,
		updateAvailable: !!latest && isNewer(latest, installed),
		releasesUrl: RELEASES_URL
	};
}
