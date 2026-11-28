<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Award,
		Camera,
		ChevronLeft,
		ChevronRight,
		Download,
		Info,
		MapPin,
		Maximize,
		X
	} from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Lightbox from '#lib/components/Lightbox.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import {
		cameraName,
		exposureParts,
		formatAperture,
		formatExposure,
		formatFocal,
		formatTaken,
		megapixels
	} from '#lib/exif-format.ts';
	import { photoSrc, photoSrcset } from '#lib/media.ts';
	import { formatDay } from '#lib/schedule.ts';
	import { swipe } from '#lib/swipe.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let photo = $derived(data.photo!);
	let fullscreen = $state<number | null>(null);

	/** Zwei Ansichten: Foto im Fokus (Standard) und «Mehr Infos» (?infos) */
	const infos = $derived(page.url.searchParams.has('infos'));
	const ratio = $derived(data.width / data.height);

	const exif = $derived(data.exif);
	const parts = $derived(exposureParts(exif));
	const camera = $derived(cameraName(exif));
	const taken = $derived(formatTaken(exif.takenAt));
	const hasGps = $derived(exif.latitude !== undefined && exif.longitude !== undefined);
	const mapUrl = $derived.by(() => {
		if (!hasGps) return '';
		const { latitude: lat, longitude: lon } = exif as { latitude: number; longitude: number };
		const d = 0.01;
		return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lon}`;
	});

	// Blättern ersetzt den Verlaufseintrag: ✕ führt zurück, woher man kam
	const go = (id: number | null, keepInfos = infos) =>
		id && goto(`/foto/${id}${keepInfos ? '?infos' : ''}`, { replace: true, reset: keepInfos });

	function close(e: MouseEvent) {
		// Innerhalb der App geöffnet: zurück; sonst zum Thema
		if (history.length > 1 && document.referrer.startsWith(location.origin)) {
			e.preventDefault();
			history.back();
		}
	}

	function keys(e: KeyboardEvent) {
		if (fullscreen !== null || infos) return;
		if (e.key === 'ArrowLeft') go(data.prev);
		if (e.key === 'ArrowRight') go(data.next);
	}

	async function rate(stars: number) {
		const previous = photo.myStars;
		photo = { ...photo, myStars: stars };
		const res = await fetch('/api/vote', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ photoId: photo.id, stars })
		});
		if (!res.ok) photo = { ...photo, myStars: previous };
		else void invalidate('app:todos');
	}
</script>

<svelte:head><title>Foto · Fotocomp</title></svelte:head>
<svelte:window onkeydown={keys} />

{#if !infos}
	<!-- Foto im Fokus: nur das Bild, darunter die Aufnahmedaten -->
	<div class="focus">
		<header class="focus-bar">
			<a class="round" href="/themen/{data.theme.id}" onclick={close} aria-label="Schliessen">
				<X size={22} />
			</a>
			{#if data.total > 1}<span class="counter">{data.pos} / {data.total}</span>{/if}
			<span class="round-space"></span>
		</header>

		<div
			class="stage"
			use:swipe={{ onleft: () => go(data.next), onright: () => go(data.prev), threshold: 60 }}
		>
			<button class="stage-img" onclick={() => (fullscreen = 0)} aria-label="Vollbild">
				<img
					src={photoSrc(photo.id)}
					srcset={photoSrcset(photo.id)}
					sizes="100vw"
					width={data.width}
					height={data.height}
					alt="Foto im Thema {data.theme.title}"
				/>
			</button>
			{#if data.prev}
				<button class="side prev" onclick={() => go(data.prev)} aria-label="Vorheriges Foto">
					<ChevronLeft size={26} />
				</button>
			{/if}
			{#if data.next}
				<button class="side next" onclick={() => go(data.next)} aria-label="Nächstes Foto">
					<ChevronRight size={26} />
				</button>
			{/if}
		</div>

		<footer class="focus-foot">
			{#if parts.length}
				<p class="exif-line">
					{#each parts as part, i (part)}{#if i}<span class="sep">·</span>{/if}<span>
							{part}
						</span>{/each}
				</p>
			{/if}
			<a class="more-btn" href="?infos" data-sveltekit-replacestate>
				<Info size={18} /> Mehr Infos
			</a>
		</footer>
	</div>
{:else}
	<!-- Mehr Infos -->
	<div class="infos">
		<div class="hero" style="--ratio: {ratio}">
			<img
				src={photoSrc(photo.id)}
				srcset={photoSrcset(photo.id)}
				sizes="(max-width: 600px) 100vw, 600px"
				alt="Foto im Thema {data.theme.title}"
			/>
			<span class="hero-shade" aria-hidden="true"></span>
			<header class="hero-bar">
				<a class="back" href="/foto/{photo.id}" data-sveltekit-replacestate>
					<ChevronLeft size={22} /> Foto
				</a>
				<span class="hero-actions">
					{#if data.canDownload}
						<a
							class="round glass"
							href={photoSrc(photo.id, 'original')}
							download
							aria-label="Original herunterladen"
						>
							<Download size={18} />
						</a>
					{/if}
					<button class="round glass" onclick={() => (fullscreen = 0)} aria-label="Vollbild">
						<Maximize size={18} />
					</button>
				</span>
			</header>
			{#if data.prev}
				<button class="side prev" onclick={() => go(data.prev)} aria-label="Vorheriges Foto">
					<ChevronLeft size={24} />
				</button>
			{/if}
			{#if data.next}
				<button class="side next" onclick={() => go(data.next)} aria-label="Nächstes Foto">
					<ChevronRight size={24} />
				</button>
			{/if}
			{#if data.total > 1 && data.total <= 12}
				<span class="dots" aria-label="Foto {data.pos} von {data.total}">
					{#each { length: data.total }, i (i)}
						<span class:on={i + 1 === data.pos}></span>
					{/each}
				</span>
			{/if}
		</div>

		<div class="page narrow info-body">
			<!-- Wer, wo, wann -->
			<section class="who">
				{#if photo.userName && photo.userId}
					<a href="/person/{photo.userId}" aria-hidden="true" tabindex="-1">
						<Avatar name={photo.userName} id={photo.userId} size={44} />
					</a>
				{/if}
				<span class="who-text">
					{#if photo.userName}
						<a class="name" href="/person/{photo.userId}">{photo.userName}</a>
					{:else}
						<span class="name">Anonym</span>
					{/if}
					<span class="muted small">
						<a href="/themen/{data.theme.id}">{data.theme.title}</a> · {formatDay(data.day)}
					</span>
				</span>
				{#if photo.badge}
					<span class="award">
						<Award size={14} />
						{photo.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}
					</span>
				{/if}
			</section>

			<!-- Bewertung: während der Bewertung anonym die eigenen Sterne, danach das Resultat -->
			{#if data.canVote}
				<section class="tile rate">
					<span class="muted small">Deine Bewertung · Namen werden um 05:00 Uhr enthüllt</span>
					<Stars value={photo.myStars} size={30} onrate={rate} />
				</section>
			{:else if data.revealed && photo.votes}
				<section class="tile stats">
					<span>
						<span class="muted">Ø Sterne</span><strong>{photo.average?.toFixed(1)}</strong>
					</span>
					<span><span class="muted">Stimmen</span><strong>{photo.votes}</strong></span>
					<span><span class="muted">Rang</span><strong>{photo.rank}.</strong></span>
				</section>
			{:else if !photo.userName}
				<p class="muted small">Der Name wird um 05:00 Uhr enthüllt.</p>
			{/if}

			<!-- Aufnahme -->
			<h2 class="section">Aufnahme</h2>
			<section class="tile shot">
				{#if camera || exif.lens}
					<span class="cam">
						<span class="cam-icon"><Camera size={20} /></span>
						<span class="cam-text">
							<strong>{camera ?? 'Kamera unbekannt'}</strong>
							{#if exif.lens}<span class="muted small">{exif.lens}</span>{/if}
						</span>
					</span>
				{/if}
				{#if parts.length}
					<div class="grid4">
						<span>
							<span class="muted">Brennweite</span><strong>
								{exif.focalLength ? formatFocal(exif.focalLength) : '–'}
							</strong>
						</span>
						<span>
							<span class="muted">Blende</span><strong>
								{exif.aperture ? formatAperture(exif.aperture) : '–'}
							</strong>
						</span>
						<span>
							<span class="muted">Zeit</span><strong>
								{exif.exposureTime ? formatExposure(exif.exposureTime).replace(' s', '') : '–'}
							</strong>
						</span>
						<span><span class="muted">ISO</span><strong>{exif.iso ?? '–'}</strong></span>
					</div>
				{/if}
				<dl>
					{#if taken}<dt>Aufgenommen</dt>
						<dd>{taken}</dd>{/if}
					<dt>Auflösung</dt>
					<dd>{data.width} × {data.height} px · {megapixels(data.width, data.height)}</dd>
					<dt>Original</dt>
					<dd>{data.original.type} · {(data.original.sizeBytes / 1e6).toFixed(1)} MB</dd>
				</dl>
			</section>

			{#if hasGps}
				<section class="tile map">
					<iframe title="Aufnahmeort" src={mapUrl} loading="lazy"></iframe>
					<a
						class="map-link"
						href="https://www.openstreetmap.org/?mlat={exif.latitude}&mlon={exif.longitude}#map=15/{exif.latitude}/{exif.longitude}"
						target="_blank"
						rel="noopener noreferrer"
					>
						<span class="muted small">
							<MapPin size={14} />
							{exif.latitude?.toFixed(4)}, {exif.longitude?.toFixed(4)}
							{#if exif.altitude !== undefined}· {Math.round(exif.altitude)} m ü. M.{/if}
						</span>
						<span class="link">Karte ›</span>
					</a>
				</section>
			{/if}

			<!-- Feedback -->
			<p class="section split">
				<span>Feedback</span>
				<span class="muted small">
					{data.isOwn ? 'nur du siehst es' : `nur ${photo.userName ?? 'der Fotograf'} sieht es`}
				</span>
			</p>
			<section class="tile feedback">
				{#if data.isOwn}
					<form method="POST" action="?/feedbackWanted" use:enhance>
						<input type="hidden" name="wanted" value={String(!data.feedbackWanted)} />
						<label class="check">
							<input
								type="checkbox"
								checked={data.feedbackWanted}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
							/>
							Feedback zu diesem Foto willkommen
						</label>
					</form>
				{/if}

				{#each data.feedback as item (item.id)}
					<article class="note">
						<div class="note-head">
							<strong class="small">{item.authorName}</strong>
							<form method="POST" action="?/deleteFeedback" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<button class="btn danger small" aria-label="Feedback löschen">Löschen</button>
							</form>
						</div>
						<p>{item.body}</p>
					</article>
				{:else}
					{#if data.isOwn}
						<p class="muted small">Noch kein Feedback erhalten.</p>
					{/if}
				{/each}

				{#if data.canGiveFeedback}
					<form method="POST" action="?/feedback" class="give" use:enhance>
						<textarea
							name="body"
							rows="3"
							placeholder="Was gefällt dir? Was könnte man ausprobieren?"
							required></textarea>
						{#if form?.feedbackError}<p class="error">{form.feedbackError}</p>{/if}
						<button class="btn accent block">Feedback senden</button>
					</form>
				{:else if !data.isOwn}
					<p class="muted small">Zu diesem Foto ist kein Feedback gewünscht.</p>
				{/if}
			</section>
		</div>
	</div>
{/if}

<Lightbox photos={[photo]} bind:index={fullscreen} />

<style>
	/* ---------------------------------------------------------- Fokus */
	.focus {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		background: #000;
		color: #fff;
		padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
	}

	.focus-bar {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 56px;
		padding: 0 8px;
	}

	.round,
	.round-space {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: inherit;
		cursor: pointer;
	}

	.counter {
		font-size: 13px;
		color: #8a8a86;
		font-variant-numeric: tabular-nums;
	}

	.stage {
		position: relative;
		flex: 1;
		min-height: 0;
		display: grid;
		touch-action: pan-y;
	}

	/* Das Bild füllt die ganze Fläche zwischen Kopf- und Fusszeile, ohne Beschnitt */
	.stage-img {
		position: absolute;
		inset: 0;
		padding: 0;
		border: 0;
		background: none;
		cursor: zoom-in;
	}

	.stage-img img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.side {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.35);
		color: #fff;
		cursor: pointer;
	}

	.side.prev {
		left: 8px;
	}

	.side.next {
		right: 8px;
	}

	/* Handy: blättern durch Wischen, die Pfeile stören dort nur */
	@media (hover: none) {
		.stage .side {
			display: none;
		}
	}

	.focus-foot {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 22px;
		padding: 18px 20px 28px;
	}

	.exif-line {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px 14px;
		font-size: 16px;
		font-weight: 300;
		letter-spacing: 0.01em;
		color: #e4e4e0;
	}

	.sep {
		color: #4a4a47;
	}

	.more-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 13px 22px;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.1);
		border: 1px solid rgb(255 255 255 / 0.18);
		color: #fff;
		font-size: 15px;
		font-weight: 700;
	}

	/* ---------------------------------------------------------- Mehr Infos */
	.hero {
		position: relative;
		max-width: 600px;
		margin: 0 auto;
		background: var(--photo-bg);
	}

	.hero img {
		width: 100%;
		max-height: 70vh;
		aspect-ratio: var(--ratio);
		object-fit: cover;
	}

	.hero-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgb(0 0 0 / 0.5) 0%, transparent 25%);
		pointer-events: none;
	}

	.hero-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 56px;
		padding: 0 8px;
		color: #fff;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 8px 6px;
		font-size: 16px;
		font-weight: 700;
	}

	.hero-actions {
		display: flex;
		gap: 4px;
	}

	.glass {
		width: 38px;
		height: 38px;
		background: rgb(0 0 0 / 0.35);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.dots {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 12px;
		display: flex;
		justify-content: center;
		gap: 6px;
	}

	.dots span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.45);
	}

	.dots span.on {
		background: #fff;
	}

	@media (min-width: 721px) {
		.hero {
			margin-top: 24px;
			border-radius: var(--radius);
			overflow: hidden;
		}
	}

	.info-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-top: 16px;
	}

	.who {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 4px;
	}

	.who-text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.name {
		font-size: 17px;
		font-weight: 800;
	}

	.award {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		flex: none;
		padding: 6px 10px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		color: var(--accent);
		font-size: 12px;
		font-weight: 800;
	}

	.tile {
		border-radius: var(--radius);
		background: var(--surface);
		padding: 14px;
	}

	.rate {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.stats,
	.grid4 {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.grid4 {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.stats > span,
	.grid4 > span {
		display: flex;
		flex-direction: column;
		font-size: 13px;
		min-width: 0;
	}

	.stats > span + span,
	.grid4 > span + span {
		border-left: 1px solid var(--line);
		padding-left: 12px;
	}

	.stats strong {
		font-size: 26px;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.grid4 strong {
		font-size: 18px;
		font-weight: 700;
		white-space: nowrap;
	}

	.section {
		padding: 12px 4px 0;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.section.split {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.section .muted {
		font-weight: 400;
		letter-spacing: 0;
	}

	.shot {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.cam {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.cam-icon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex: none;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		color: var(--muted);
	}

	.cam-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px 16px;
		margin: 0;
		padding-top: 12px;
		border-top: 1px solid var(--line);
		font-size: 14px;
	}

	dt {
		color: var(--muted);
	}

	dd {
		margin: 0;
		text-align: right;
	}

	.shot dl:first-child {
		padding-top: 0;
		border-top: 0;
	}

	.map {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 0 0 12px;
		overflow: hidden;
	}

	.map iframe {
		width: 100%;
		height: 180px;
		border: 0;
		background: var(--surface-2);
	}

	:global([data-theme='dark']) .map iframe {
		filter: grayscale(0.4) brightness(0.85);
	}

	.map-link {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 0 14px;
	}

	.map-link .muted {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.link {
		font-size: 14px;
		font-weight: 700;
		color: var(--accent);
	}

	.feedback {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.note {
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		font-size: 15px;
		white-space: pre-line;
	}

	.note-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.give {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
</style>
