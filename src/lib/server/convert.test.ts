import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { closeExifTool, prepareImage, UnsupportedImageError } from './convert.ts';

const fixture = (name: string) => readFileSync(path.join(import.meta.dirname, 'fixtures', name));

afterAll(() => closeExifTool());

describe('prepareImage', () => {
	it('JPEG: dreht nach EXIF und liest die Metadaten', async () => {
		const img = await prepareImage(fixture('portrait.jpg'));
		expect([img.ext, img.width, img.height]).toEqual(['jpg', 480, 640]);
		expect(img.exif).toMatchObject({
			make: 'Apple',
			model: 'iPhone 15 Pro',
			aperture: 1.8,
			iso: 64,
			takenAt: '2026-11-20T13:32:10.000Z' // 14:32 Zürcher Zeit
		});
		expect(img.exif.exposureTime).toBeCloseTo(1 / 120);
		expect(img.exif.latitude).toBeCloseTo(47.3769);
		expect(img.exif.longitude).toBeCloseTo(8.5417);
	});

	it('HEIC: wird dekodiert und richtig gedreht', async () => {
		const img = await prepareImage(fixture('portrait.heic'));
		expect([img.ext, img.type, img.width, img.height]).toEqual(['heic', 'HEIC', 480, 640]);
		const { info } = await img.image.webp().toBuffer({ resolveWithObject: true });
		expect([info.width, info.height]).toEqual([480, 640]);
		expect(img.exif.latitude).toBeCloseTo(47.3769);
	});

	it('PNG ohne Metadaten', async () => {
		const img = await prepareImage(fixture('plain.png'));
		expect([img.ext, img.width, img.height, img.exif]).toEqual(['png', 300, 200, {}]);
	});

	it('lehnt Dateien ab, die kein Foto sind', async () => {
		await expect(prepareImage(fixture('text.txt'))).rejects.toBeInstanceOf(UnsupportedImageError);
	});

	// Grosse RAW-Dateien liegen nicht im Repo. Zum Testen: FOTOCOMP_DNG=/pfad/zu/foto.dng
	const dng = process.env.FOTOCOMP_DNG;
	it.skipIf(!dng || !existsSync(dng))(
		'DNG (iPhone ProRAW): nutzt die Kamera-Vorschau',
		async () => {
			const img = await prepareImage(readFileSync(dng!));
			expect(img.ext).toBe('dng');
			expect(Math.max(img.width, img.height)).toBeGreaterThanOrEqual(1600);
			const { info } = await img.image.webp().toBuffer({ resolveWithObject: true });
			expect([info.width, info.height]).toEqual([img.width, img.height]);
			expect(img.exif.make).toBe('Apple');
		}
	);
});
