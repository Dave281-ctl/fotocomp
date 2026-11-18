<script lang="ts">
	import { MapPin } from '@lucide/svelte';
	import type { PhotoExif } from '../types.ts';

	let { exif, width, height }: { exif: PhotoExif; width: number; height: number } = $props();

	const camera = $derived.by(() => {
		const { make, model } = exif;
		if (!model) return make;
		// Viele Hersteller wiederholen den Namen im Modell («Canon Canon EOS R6»)
		return make && !model.toLowerCase().startsWith(make.toLowerCase().split(' ')[0])
			? `${make} ${model}`
			: model;
	});

	const exposure = (t: number) => (t >= 1 ? `${t} s` : `1/${Math.round(1 / t)} s`);
	const taken = $derived(
		exif.takenAt
			? new Intl.DateTimeFormat('de-CH', {
					dateStyle: 'long',
					timeStyle: 'short',
					timeZone: 'Europe/Zurich'
				}).format(new Date(exif.takenAt))
			: null
	);

	const rows = $derived(
		[
			['Kamera', camera],
			['Objektiv', exif.lens],
			[
				'Brennweite',
				exif.focalLength &&
					`${Math.round(exif.focalLength)} mm${exif.focalLength35 && Math.round(exif.focalLength35) !== Math.round(exif.focalLength) ? ` (KB ${exif.focalLength35} mm)` : ''}`
			],
			['Blende', exif.aperture && `ƒ/${exif.aperture}`],
			['Belichtung', exif.exposureTime && exposure(exif.exposureTime)],
			['ISO', exif.iso],
			['Aufgenommen', taken],
			['Auflösung', `${width} × ${height} px · ${((width * height) / 1e6).toFixed(1)} MP`]
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
