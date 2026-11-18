import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { isPhotoPublic } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { originalFile, THUMB_SIZES, thumbFile, type ThumbSize } from '#lib/server/photos.ts';
import { photos } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import type { RequestHandler } from './$types';

const MIME: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.heic': 'image/heic'
};

/** Liefert Thumbnails und Originale nur an angemeldete User mit Berechtigung aus. */
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user!;
	const id = Number(params.id);
	const [photo] = Number.isInteger(id)
		? await db.select().from(photos).where(eq(photos.id, id))
		: [];
	if (!photo) error(404);

	const isOwner = photo.userId === user.id;
	const isAdmin = user.role === 'admin';
	if (!isOwner && !isAdmin && !isPhotoPublic(photo.day, now())) error(404);

	let file: string;
	let type: string;
	if (params.size === 'original') {
		// Originale gibt es nur für den Fotografen selbst und für Admins.
		if (!isOwner && !isAdmin) error(404);
		file = originalFile(photo);
		type = MIME[path.extname(file)] ?? 'application/octet-stream';
	} else {
		const size = Number(params.size) as ThumbSize;
		if (!THUMB_SIZES.includes(size)) error(404);
		file = thumbFile(photo.id, size);
		type = 'image/webp';
	}

	const info = await stat(file).catch(() => null);
	if (!info) error(404);

	const headers: Record<string, string> = {
		'content-type': type,
		'content-length': String(info.size),
		// Jede neue Version eines Fotos erhält eine neue ID, daher dauerhaft cachebar.
		'cache-control': 'private, max-age=31536000, immutable'
	};
	if (params.size === 'original') {
		headers['content-disposition'] = `inline; filename="${path.basename(file)}"`;
	}
	return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers });
};
