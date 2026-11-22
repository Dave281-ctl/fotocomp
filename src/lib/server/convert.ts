/**
 * Macht aus (fast) jeder Fotodatei ein Bild, das sharp verarbeiten kann.
 *
 * - JPEG, PNG, WebP, AVIF, TIFF, GIF: direkt mit sharp
 * - HEIC/HEIF (iPhone, viele Android-Geräte): Dekodieren mit libheif (WebAssembly)
 * - RAW (DNG, CR3, NEF, ARW …): die eingebettete Kamera-Vorschau; fehlt sie oder
 *   ist sie kleiner als das grösste Thumbnail, wird das RAW mit LibRaw (dcraw_emu) entwickelt
 *
 * Das Format wird von ExifTool am Inhalt erkannt, nicht an der Endung.
 * Die Metadaten (Kamera, Belichtung, GPS) kommen ebenfalls von ExifTool.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { TZDate } from '@date-fns/tz';
import { DefaultExifToolOptions, ExifDateTime, exiftool, type Tags } from 'exiftool-vendored';
import decodeHeic from 'heic-decode';
import sharp, { type Sharp } from 'sharp';
import { TIME_ZONE } from '../schedule.ts';
import type { PhotoExif } from '../types.ts';

export class UnsupportedImageError extends Error {}

export const SUPPORTED_LABEL =
	'JPEG, HEIC, PNG, WebP, AVIF, TIFF oder RAW (DNG, CR3, NEF, ARW, RAF, ORF …)';

/** Direkt mit sharp lesbar (ExifTool-Dateityp). */
const DIRECT = new Set(['JPEG', 'PNG', 'WEBP', 'AVIF', 'TIFF', 'GIF']);
const HEIF = new Set(['HEIC', 'HEIF']);
/** RAW-Formate gängiger Kameras und Handys (ExifTool-Dateityp). */
const RAW = new Set(
	'DNG CR2 CR3 CRW NEF NRW ARW SR2 SRF RAF ORF ORI RW2 RWL PEF SRW X3F 3FR IIQ ERF MEF MOS DCR KDC MRW'.split(
		' '
	)
);
/** Diese Werte als Zahl statt als gerundeten Text lesen (z.B. Blende 1.78 statt 1.8). */
const NUMERIC_TAGS = [
	...DefaultExifToolOptions.numericTags,
	'FNumber',
	'ExposureTime',
	'FocalLength',
	'FocalLengthIn35mmFormat',
	'ISO'
];
/**
 * Kleinere RAW-Vorschauen werden stattdessen entwickelt (längste Seite in px).
 * Entspricht dem grössten Thumbnail, damit auch das Vollbild scharf ist.
 */
const MIN_PREVIEW = 2400;

export interface PreparedImage {
	/** Bereits richtig gedrehtes Bild für die Thumbnails. */
	image: Sharp;
	width: number;
	height: number;
	/** Dateiendung des Originals, z.B. «jpg», «heic», «dng». */
	ext: string;
	/** Lesbarer Dateityp, z.B. «DNG». */
	type: string;
	exif: PhotoExif;
}

/** Liest eine hochgeladene Datei und bereitet sie für die Thumbnails vor. */
export async function prepareImage(buffer: Buffer): Promise<PreparedImage> {
	// ExifTool arbeitet mit Dateien, daher kurz in ein temporäres Verzeichnis schreiben.
	const dir = await mkdtemp(path.join(tmpdir(), 'fotocomp-'));
	const file = path.join(dir, 'upload');
	try {
		await writeFile(file, buffer);
		const tags = await exiftool.read(file, { numericTags: NUMERIC_TAGS });
		const type = String(tags.FileType ?? '').toUpperCase();
		const ext = String(tags.FileTypeExtension ?? type).toLowerCase();
		const base = { ext, type, exif: toPhotoExif(tags) };

		if (DIRECT.has(type)) return { ...base, ...(await fromEncoded(buffer)) };
		if (HEIF.has(type)) return { ...base, ...(await fromHeic(buffer)) };
		if (RAW.has(type)) return { ...base, ...(await fromRaw(file, tags)) };
		throw new UnsupportedImageError(
			`Dieses Format wird nicht unterstützt. Möglich sind ${SUPPORTED_LABEL}.`
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

/** JPEG, PNG usw.: sharp dreht anhand der EXIF-Ausrichtung. */
async function fromEncoded(buffer: Buffer, rotate = 0) {
	const meta = await sharp(buffer).metadata();
	if (rotate && !meta.orientation) {
		const swap = rotate % 180 !== 0;
		return {
			image: sharp(buffer, { failOn: 'none' }).rotate(rotate),
			width: swap ? meta.height : meta.width,
			height: swap ? meta.width : meta.height
		};
	}
	return {
		image: sharp(buffer, { failOn: 'none' }).autoOrient(),
		width: meta.autoOrient.width,
		height: meta.autoOrient.height
	};
}

/** HEIC: libheif wendet die Drehung beim Dekodieren selbst an. */
async function fromHeic(buffer: Buffer) {
	const { width, height, data } = await decodeHeic({ buffer });
	const pixels = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
	return { image: sharp(pixels, { raw: { width, height, channels: 4 } }), width, height };
}

/** Grad im Uhrzeigersinn für die EXIF-Ausrichtung (Spiegelungen kommen bei Kameras nicht vor). */
const ROTATION: Record<number, number> = { 3: 180, 6: 90, 8: 270 };

/** RAW: grösste eingebettete Vorschau, sonst mit LibRaw entwickeln. */
async function fromRaw(file: string, tags: Tags) {
	const rotate = ROTATION[Number(tags.Orientation)] ?? 0;
	for (const tag of ['JpgFromRaw', 'PreviewImage', 'OtherImage'] as const) {
		const preview = await exiftool.extractBinaryTagToBuffer(tag, file).catch(() => null);
		if (!preview?.length) continue;
		const meta = await sharp(preview)
			.metadata()
			.catch(() => null);
		if (meta && Math.max(meta.width, meta.height) >= MIN_PREVIEW) {
			return fromEncoded(preview, rotate);
		}
	}
	return develop(file);
}

const run = promisify(execFile);

/** Entwickelt ein RAW mit LibRaw (Kamera-Weissabgleich, als TIFF auf stdout). */
async function develop(file: string) {
	try {
		const { stdout } = await run('dcraw_emu', ['-w', '-T', '-Z', '-', file], {
			encoding: 'buffer',
			maxBuffer: 1024 * 1024 * 1024
		});
		return fromEncoded(stdout);
	} catch {
		throw new UnsupportedImageError(
			'Dieses RAW-Foto konnte nicht gelesen werden. Bitte als JPEG oder HEIC exportieren und nochmals versuchen.'
		);
	}
}

// --------------------------------------------------------------- Metadaten

const num = (v: unknown): number | undefined => {
	if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
	if (typeof v !== 'string') return undefined;
	const fraction = v.match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
	if (fraction) return Number(fraction[1]) / Number(fraction[2]);
	const n = parseFloat(v);
	return Number.isFinite(n) ? n : undefined;
};
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Aufnahmezeit; ohne Zeitzone in der Datei gilt Zürcher Ortszeit. */
function takenAt(tags: Tags): string | undefined {
	const dt = tags.DateTimeOriginal ?? tags.CreateDate;
	if (!(dt instanceof ExifDateTime)) return undefined;
	const date = dt.hasZone
		? dt.toDate()
		: new TZDate(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, TIME_ZONE);
	return isNaN(date.getTime()) ? undefined : new Date(date.getTime()).toISOString();
}

/** Für Fotografen interessante Metadaten. */
export function toPhotoExif(tags: Tags): PhotoExif {
	const altitude = num(tags.GPSAltitude);
	const exif: PhotoExif = {
		make: str(tags.Make),
		model: str(tags.Model),
		lens: str(tags.LensModel) ?? str(tags.Lens) ?? str(tags.LensMake),
		focalLength: num(tags.FocalLength),
		focalLength35: num(tags.FocalLengthIn35mmFormat),
		aperture: num(tags.FNumber),
		exposureTime: num(tags.ExposureTime),
		iso: num(tags.ISO),
		takenAt: takenAt(tags),
		latitude: num(tags.GPSLatitude),
		longitude: num(tags.GPSLongitude),
		altitude:
			altitude !== undefined && String(tags.GPSAltitudeRef ?? '').startsWith('Below')
				? -altitude
				: altitude
	};
	return Object.fromEntries(Object.entries(exif).filter(([, v]) => v !== undefined));
}

/** ExifTool läuft als Hintergrundprozess; beim Herunterfahren beenden. */
export const closeExifTool = () => exiftool.end();
