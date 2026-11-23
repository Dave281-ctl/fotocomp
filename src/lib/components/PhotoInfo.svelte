<script lang="ts">
	import { MapPin } from '@lucide/svelte';
	import {
		cameraName,
		formatAperture,
		formatExposure,
		formatFocal,
		formatTaken,
		megapixels
	} from '../exif-format.ts';
	import type { PhotoExif } from '../types.ts';

	let {
		exif,
		width,
		height,
		original
	}: {
		exif: PhotoExif;
		width: number;
		height: number;
		/** Format und Grösse der Originaldatei, z.B. DNG · 29,2 MB */
		original?: { type: string; sizeBytes: number };
	} = $props();

	const camera = $derived(cameraName(exif));
	const taken = $derived(formatTaken(exif.takenAt));

	const rows = $derived(
		[
			['Kamera', camera],
			['Objektiv', exif.lens],
			[
				'Brennweite',
				exif.focalLength &&
					`${formatFocal(exif.focalLength)}${exif.focalLength35 && Math.round(exif.focalLength35) !== Math.round(exif.focalLength) ? ` (KB ${exif.focalLength35} mm)` : ''}`
			],
			['Blende', exif.aperture && formatAperture(exif.aperture)],
			['Belichtung', exif.exposureTime && formatExposure(exif.exposureTime)],
			['ISO', exif.iso],
			['Aufgenommen', taken],
			['Auflösung', `${width} × ${height} px · ${megapixels(width, height)}`],
			['Original', original && `${original.type} · ${(original.sizeBytes / 1e6).toFixed(1)} MB`]
		].filter((row): row is [string, string | number] => !!row[1])
	);

	const hasGps = $derived(exif.latitude !== undefined && exif.longitude !== undefined);
	const mapUrl = $derived.by(() => {
		if (!hasGps) return '';
		const { latitude: lat, longitude: lon } = exif as { latitude: number; longitude: number };
		const d = 0.01;
		return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lon}`;
	});
</script>

<dl>
	{#each rows as [label, value] (label)}
		<dt>{label}</dt>
		<dd>{value}</dd>
	{/each}
</dl>

{#if hasGps}
	<div class="map stack" style="--gap: 8px">
		<iframe title="Aufnahmeort" src={mapUrl} loading="lazy"></iframe>
		<a
			class="muted small row"
			style="--gap: 6px"
			href="https://www.openstreetmap.org/?mlat={exif.latitude}&mlon={exif.longitude}#map=15/{exif.latitude}/{exif.longitude}"
			target="_blank"
			rel="noopener noreferrer"
		>
			<MapPin size={14} />
			{exif.latitude?.toFixed(5)}, {exif.longitude?.toFixed(5)}
			{#if exif.altitude !== undefined}· {Math.round(exif.altitude)} m ü. M.{/if}
		</a>
	</div>
{/if}

<style>
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px 20px;
		margin: 0;
		font-size: 14px;
	}

	dt {
		color: var(--muted);
	}

	dd {
		margin: 0;
	}

	.map {
		margin-top: 20px;
	}

	iframe {
		width: 100%;
		height: 200px;
		border: 0;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	:global([data-theme='dark']) iframe {
		filter: grayscale(0.4) brightness(0.85);
	}
</style>
