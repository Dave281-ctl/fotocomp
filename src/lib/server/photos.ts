import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import exifr from 'exifr';
import sharp, { type Metadata } from 'sharp';
import { slugify } from './auth.ts';
import { config } from './config.ts';
import { db } from './db.ts';
import { photos, type Photo, type PhotoExif, type Theme, type User } from './schema.ts';

/** Thumbnail-Breiten: Handy, Monitor, Vollbild auf grossen Bildschirmen. */
export const THUMB_SIZES = [480, 1200, 2400] as const;
export type ThumbSize = (typeof THUMB_SIZES)[number];

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const FORMATS: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp', heif: 'heic' };

const originalsDir = () => path.resolve(config.dataDir, 'photos', 'originals');
const thumbsDir = (id: number) => path.resolve(config.dataDir, 'photos', 'thumbs', String(id));

export const originalFile = (photo: Pick<Photo, 'originalPath'>) =>
	path.join(originalsDir(), photo.originalPath);
export const thumbFile = (id: number, size: ThumbSize) => path.join(thumbsDir(id), `${size}.webp`);

export class UploadError extends Error {}

/**
 * Speichert das Foto des Tages: Original unverändert unter
 * originals/<user>/<tag>_<thema>_<id>.<ext>, dazu drei WebP-Thumbnails ohne EXIF.
 * Ein bestehendes Foto desselben Tages wird ersetzt.
 */
export async function savePhoto(opts: {
	user: User;
	theme: Theme;
	day: string;
	file: File;
	feedbackWanted: boolean;
}): Promise<Photo> {
	const { user, theme, day, file, feedbackWanted } = opts;
	if (file.size === 0) throw new UploadError('Bitte ein Foto auswählen.');
	if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('Das Foto ist grösser als 50 MB.');

	const buffer = Buffer.from(await file.arrayBuffer());
	let meta: Metadata;
	try {
		meta = await sharp(buffer).metadata();
	} catch {
		throw new UploadError('Diese Datei ist kein unterstütztes Bild (JPEG, PNG oder WebP).');
	}
	const ext = meta.format && FORMATS[meta.format];
	if (!ext) throw new UploadError('Bitte ein JPEG, PNG oder WebP hochladen.');

	// Thumbnails zuerst im Speicher erzeugen: scheitert das, wird nichts gespeichert.
	// Abmessungen nach Berücksichtigung der EXIF-Ausrichtung (Hoch-/Querformat).
	const { width, height } = meta.autoOrient;
	let thumbs: Buffer[];
	try {
		const base = sharp(buffer, { failOn: 'none' }).autoOrient();
		thumbs = await Promise.all(
			THUMB_SIZES.map((size) =>
				base
					.clone()
					.resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
					.webp({ quality: size >= 2400 ? 85 : 80 })
					.toBuffer()
			)
		);
	} catch {
		throw new UploadError(
			'Das Bild konnte nicht gelesen werden. Bitte als JPEG speichern und nochmals versuchen.'
		);
	}

	const exif = await readExif(buffer);
	const previous = await findPhoto(user.id, theme.id, day);

	const photo = await db.transaction(async (tx) => {
		if (previous) await tx.delete(photos).where(eq(photos.id, previous.id));
		const [row] = await tx
			.insert(photos)
			.values({
				userId: user.id,
				themeId: theme.id,
				day,
				originalPath: '',
				width,
				height,
				sizeBytes: file.size,
				exif,
				feedbackWanted
			})
			.returning();
		const originalPath = path.join(user.folder, `${day}_${slugify(theme.title)}_${row.id}.${ext}`);
		await tx.update(photos).set({ originalPath }).where(eq(photos.id, row.id));
		return { ...row, originalPath };
	});

	await mkdir(path.dirname(originalFile(photo)), { recursive: true });
	await writeFile(originalFile(photo), buffer);
	await mkdir(thumbsDir(photo.id), { recursive: true });
	await Promise.all(THUMB_SIZES.map((size, i) => writeFile(thumbFile(photo.id, size), thumbs[i])));

	if (previous) await removeFiles(previous);
	return photo;
}

export async function findPhoto(userId: number, themeId: number, day: string) {
	const [row] = await db
		.select()
		.from(photos)
		.where(and(eq(photos.userId, userId), eq(photos.themeId, themeId), eq(photos.day, day)));
	return row ?? null;
}

async function removeFiles(photo: Photo) {
	await rm(originalFile(photo), { force: true });
	await rm(thumbsDir(photo.id), { recursive: true, force: true });
}

export async function deletePhoto(photo: Photo) {
	await db.delete(photos).where(eq(photos.id, photo.id));
	await removeFiles(photo);
}

/** Liest die für Fotografen interessanten Metadaten. */
async function readExif(buffer: Buffer): Promise<PhotoExif> {
	try {
		const raw = await exifr.parse(buffer, { gps: true, exif: true, tiff: true, xmp: false });
		if (!raw) return {};
		const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
		const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
		const date = raw.DateTimeOriginal ?? raw.CreateDate;
		const exif: PhotoExif = {
			make: str(raw.Make),
			model: str(raw.Model),
			lens: str(raw.LensModel) ?? str(raw.LensMake),
			focalLength: num(raw.FocalLength),
			focalLength35: num(raw.FocalLengthIn35mmFormat),
			aperture: num(raw.FNumber),
			exposureTime: num(raw.ExposureTime),
			iso: num(raw.ISO) ?? num(raw.ISOSpeedRatings),
			takenAt: date instanceof Date && !isNaN(date.getTime()) ? date.toISOString() : undefined,
			latitude: num(raw.latitude),
			longitude: num(raw.longitude),
			altitude: num(raw.GPSAltitude)
		};
		return Object.fromEntries(Object.entries(exif).filter(([, v]) => v !== undefined));
	} catch {
		return {};
	}
}
