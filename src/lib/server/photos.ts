import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import type { Sharp } from 'sharp';
import { slugify } from './auth.ts';
import { config } from './config.ts';
import { prepareImage, UnsupportedImageError } from './convert.ts';
import { db } from './db.ts';
import { photos, type Photo, type Theme, type User } from './schema.ts';

/** Thumbnail-Breiten: Handy, Monitor, Vollbild auf grossen Bildschirmen. */
export const THUMB_SIZES = [480, 1200, 2400] as const;
export type ThumbSize = (typeof THUMB_SIZES)[number];

const originalsDir = () => path.resolve(config.dataDir, 'photos', 'originals');
const thumbsDir = (id: number) => path.resolve(config.dataDir, 'photos', 'thumbs', String(id));

export const originalFile = (photo: Pick<Photo, 'originalPath'>) =>
	path.join(originalsDir(), photo.originalPath);
export const thumbFile = (id: number, size: ThumbSize) => path.join(thumbsDir(id), `${size}.webp`);

export class UploadError extends Error {}

/** Dateityp des Originals für die Anzeige, z.B. «DNG» oder «HEIC». */
export const fileType = (originalPath: string) =>
	path.extname(originalPath).slice(1).toUpperCase().replace('JPG', 'JPEG');

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
	const maxMb = config.maxUploadMb;
	if (file.size === 0) throw new UploadError('Bitte ein Foto auswählen.');
	if (file.size > maxMb * 1024 * 1024) {
		throw new UploadError(`Das Foto ist grösser als ${maxMb} MB.`);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	let prepared: Awaited<ReturnType<typeof prepareImage>>;
	try {
		prepared = await prepareImage(buffer);
	} catch (e) {
		if (e instanceof UnsupportedImageError) throw new UploadError(e.message);
		console.error('Foto konnte nicht gelesen werden:', e);
		throw new UploadError('Diese Datei konnte nicht als Foto gelesen werden.');
	}
	const { image, width, height, ext, exif } = prepared;

	// Thumbnails zuerst im Speicher erzeugen: scheitert das, wird nichts gespeichert.
	let thumbs: Buffer[];
	try {
		thumbs = await makeThumbs(image);
	} catch (e) {
		console.error('Thumbnails fehlgeschlagen:', e);
		throw new UploadError(
			'Das Bild konnte nicht verarbeitet werden. Bitte als JPEG speichern und nochmals versuchen.'
		);
	}

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

/** Drei WebP-Thumbnails ohne Metadaten. */
function makeThumbs(image: Sharp) {
	return Promise.all(
		THUMB_SIZES.map((size) =>
			image
				.clone()
				.resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
				.webp({ quality: size >= 2400 ? 85 : 80 })
				.toBuffer()
		)
	);
}
