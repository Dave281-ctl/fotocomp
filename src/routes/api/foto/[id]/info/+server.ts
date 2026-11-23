import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { canSeePhoto } from '#lib/server/gallery.ts';
import { photos } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import type { RequestHandler } from './$types';

/** Aufnahmedaten für die Info-Einblendung im Vollbild (ohne GPS). */
export const GET: RequestHandler = async ({ params, locals }) => {
	const id = Number(params.id);
	const [photo] = Number.isInteger(id)
		? await db.select().from(photos).where(eq(photos.id, id))
		: [];
	if (!photo || !canSeePhoto(photo, locals.user!, now())) error(404);
	const { make, model, lens, focalLength, focalLength35, aperture, exposureTime, iso, takenAt } =
		photo.exif;
	const exif = {
		make,
		model,
		lens,
		focalLength,
		focalLength35,
		aperture,
		exposureTime,
		iso,
		takenAt
	};
	return json({ exif, width: photo.width, height: photo.height });
};
