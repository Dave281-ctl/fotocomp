// Versionsnummern vergleichen – gemeinsam für die App und den Release-Workflow.
//   v0.9.0-beta.1 < v0.9.0-beta.2 < v0.9.0 < v0.9.1
// Eine Vorabversion (mit «-…») ist älter als die stabile Version mit derselben Nummer.

/**
 * «v0.9.0-beta.2» → { core: [0, 9, 0], pre: ['beta', 2] }; keine Versionsnummer → null
 * @param {string} version
 * @returns {{ core: number[]; pre: (string | number)[] | null } | null}
 */
export function parseVersion(version) {
	const m = String(version).match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
	if (!m) return null;
	const pre = m[4] ? m[4].split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : null;
	return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre };
}

/**
 * < 0: a älter, 0: gleich, > 0: a neuer (ungültige Versionen gelten als ältest)
 * @param {string} a
 * @param {string} b
 */
export function compareVersions(a, b) {
	const x = parseVersion(a);
	const y = parseVersion(b);
	if (!x || !y) return x ? 1 : y ? -1 : 0;
	for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] - y.core[i];
	if (!x.pre || !y.pre) return x.pre ? -1 : y.pre ? 1 : 0;
	for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
		const [p, q] = [x.pre[i], y.pre[i]];
		if (p === undefined) return -1;
		if (q === undefined) return 1;
		if (p === q) continue;
		if (typeof p === 'number' && typeof q === 'number') return p - q;
		return String(p) < String(q) ? -1 : 1;
	}
	return 0;
}

/** @param {string} version */
export const isPrerelease = (version) => !!parseVersion(version)?.pre;

/**
 * Die neueste Version einer Liste (optional nur stabile).
 * @param {string[]} versions
 * @param {{ stableOnly?: boolean }} [options]
 */
export function newestVersion(versions, { stableOnly = false } = {}) {
	return versions
		.filter((v) => parseVersion(v) && (!stableOnly || !isPrerelease(v)))
		.sort(compareVersions)
		.at(-1);
}
