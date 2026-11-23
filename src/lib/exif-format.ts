/** Formatierung der Aufnahmedaten – gemeinsam für Detailseite und Vollbild. */
import type { PhotoExif } from './types.ts';

/** Kamera ohne doppelten Herstellernamen («Canon Canon EOS R6» → «Canon EOS R6»). */
export function cameraName({ make, model }: PhotoExif): string | undefined {
	if (!model) return make;
	return make && !model.toLowerCase().startsWith(make.toLowerCase().split(' ')[0])
		? `${make} ${model}`
		: model;
}

export const formatExposure = (t: number) => (t >= 1 ? `${t} s` : `1/${Math.round(1 / t)} s`);
export const formatAperture = (f: number) => `ƒ/${f}`;
export const formatFocal = (mm: number) => `${Math.round(mm)} mm`;

export function formatTaken(takenAt: string | undefined): string | null {
	if (!takenAt) return null;
	return new Intl.DateTimeFormat('de-CH', {
		dateStyle: 'long',
		timeStyle: 'short',
		timeZone: 'Europe/Zurich'
	}).format(new Date(takenAt));
}

export const megapixels = (width: number, height: number) =>
	`${((width * height) / 1e6).toFixed(1)} MP`;

/** Die Belichtung in einer Zeile: Brennweite, Blende, Belichtungszeit, ISO. */
export function exposureParts(exif: PhotoExif): string[] {
	return [
		exif.focalLength && formatFocal(exif.focalLength),
		exif.aperture && formatAperture(exif.aperture),
		exif.exposureTime && formatExposure(exif.exposureTime),
		exif.iso && `ISO ${exif.iso}`
	].filter((s): s is string => !!s);
}
