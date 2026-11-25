/** Kamerastatistik einer Person aus den Aufnahmedaten – reine Funktionen, testbar. */
import { cameraName } from './exif-format.ts';
import type { PhotoExif } from './types.ts';

export const UNKNOWN_CAMERA = 'Unbekannt';

/** Häufigster Wert einer Liste (bei Gleichstand der zuerst gesehene). */
function mostCommon<T>(values: (T | undefined | null)[]): T | null {
	const counts = new Map<T, number>();
	for (const v of values)
		if (v !== undefined && v !== null) counts.set(v, (counts.get(v) ?? 0) + 1);
	let best: T | null = null;
	let n = 0;
	for (const [v, c] of counts) if (c > n) [best, n] = [v, c];
	return best;
}

/** Kameras nach Anzahl Fotos, dazu das meistgenutzte Objektiv, Brennweite und Blende. */
export function cameraStats(exifs: PhotoExif[]) {
	const counts = new Map<string, number>();
	for (const exif of exifs) {
		const name = cameraName(exif) ?? UNKNOWN_CAMERA;
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	const cameras = [...counts.entries()]
		.map(([name, photos]) => ({ name, photos }))
		.sort((a, b) => b.photos - a.photos || a.name.localeCompare(b.name));
	return {
		cameras,
		lens: mostCommon(
			exifs.map((e) => (e.lens && !(e.model && e.lens.startsWith(e.model)) ? e.lens : null))
		),
		focalLength: mostCommon(exifs.map((e) => (e.focalLength ? Math.round(e.focalLength) : null))),
		aperture: mostCommon(exifs.map((e) => e.aperture))
	};
}
