<script lang="ts" module>
	import type { PhotoExif } from '../types.ts';

	type PhotoMeta = { exif: PhotoExif; width: number; height: number };

	/** Bereits geladene Aufnahmedaten, damit Blättern nicht neu lädt. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- reiner Cache, nicht reaktiv
	const metaCache = new Map<number, Promise<PhotoMeta | null>>();
	function loadMeta(id: number) {
		if (!metaCache.has(id)) {
			metaCache.set(
				id,
				fetch(`/api/foto/${id}/info`)
					.then((r) => (r.ok ? (r.json() as Promise<PhotoMeta>) : null))
					.catch(() => null)
			);
		}
		return metaCache.get(id)!;
	}

	/** Infos sind standardmässig an; ausgeschaltet mit (i) bleiben sie es für die Sitzung. */
	let infoOn = true;

	type FullscreenDoc = Document & {
		webkitFullscreenEnabled?: boolean;
		webkitFullscreenElement?: Element | null;
		webkitExitFullscreen?: () => void;
	};
	type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => void };
</script>

<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { ChevronLeft, ChevronRight, Info, Maximize, Minimize, X } from '@lucide/svelte';
	import { cameraName, exposureParts, formatTaken, megapixels } from '../exif-format.ts';
	import { photoSrc } from '../media.ts';
	import type { FeedPhoto } from '../types.ts';
	import Stars from './Stars.svelte';

	let {
		photos,
		index = $bindable(),
		voting = false,
		onrate
	}: {
		photos: FeedPhoto[];
		/** Index des angezeigten Fotos; `null` = geschlossen. */
		index: number | null;
		voting?: boolean;
		onrate?: (photo: FeedPhoto, stars: number) => void;
	} = $props();

	let root = $state<HTMLDivElement>();
	let touchX: number | null = null;

	const photo = $derived(index === null ? null : photos[index]);

	// ------------------------------------------------ Info-Einblendung
	const TOP_BAR = 56;
	const BOTTOM_BAR = 64;
	const SIDE_MIN = 200; // so breit muss der Rand neben dem Bild mindestens sein
	const BELOW_MIN = 66; // so hoch muss der Rand unter dem Bild mindestens sein

	let showInfo = $state(infoOn);
	let meta = $state<PhotoMeta | null>(null);
	let viewW = $state(0);
	let viewH = $state(0);

	function toggleInfo() {
		showInfo = infoOn = !showInfo;
	}

	$effect(() => {
		if (!showInfo || !photo) return;
		const id = photo.id;
		meta = null;
		loadMeta(id).then((m) => {
			if (photo?.id === id) meta = m;
		});
	});

	/**
	 * Wo ist Platz für die Infos, ohne das Bild zu verkleinern?
	 * Daneben (Hochformat am Computer), darunter (Querformat am Handy)
	 * oder als schmale Leiste über dem unteren Bildrand.
	 */
	const infoPlace = $derived.by(() => {
		if (!photo || !viewW || !viewH) return null;
		const areaH = viewH - TOP_BAR - BOTTOM_BAR;
		const scale = Math.min(viewW / photo.width, areaH / photo.height);
		const w = photo.width * scale;
		const h = photo.height * scale;
		const left = (viewW - w) / 2;
		const top = TOP_BAR + (areaH - h) / 2;
		const bottom = viewH - top - h; // Abstand Bildunterkante → Fensterrand
		if (left >= SIDE_MIN) {
			const width = Math.min(280, left - 64);
			return {
				kind: 'side',
				style: `left:${left + w + 24}px; bottom:${bottom}px; width:${width}px`
			};
		}
		if ((areaH - h) / 2 >= BELOW_MIN) {
			return { kind: 'below', style: `left:${left}px; top:${top + h + 10}px; width:${w}px` };
		}
		return { kind: 'overlay', style: `left:${left}px; bottom:${bottom}px; width:${w}px` };
	});

	const exposure = $derived(meta ? exposureParts(meta.exif) : []);
	/** Kamera und Objektiv; beim Handy ist das «Objektiv» nur der Modellname nochmals. */
	const gear = $derived.by(() => {
		if (!meta) return [];
		const { model, lens } = meta.exif;
		const lensUseful = lens && !(model && lens.startsWith(model));
		return [cameraName(meta.exif), lensUseful ? lens : null].filter((s): s is string => !!s);
	});
	const when = $derived(
		meta ? [formatTaken(meta.exif.takenAt), megapixels(meta.width, meta.height)] : []
	);
	const onDetailPage = $derived(photo ? page.url.pathname === `/foto/${photo.id}` : false);
	const go = (step: number) => {
		if (index === null) return;
		index = (index + step + photos.length) % photos.length;
	};

	// Vollbild: Das iPhone kann es nur für Videos – dort gibt es den Knopf nicht
	// (die Ansicht füllt den Bildschirm ohnehin). iPad und ältere Safari: mit Präfix.
	let canFullscreen = $state(false);
	let isFullscreen = $state(false);
	onMount(() => {
		const doc = document as FullscreenDoc;
		canFullscreen = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
		const update = () => (isFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement));
		document.addEventListener('fullscreenchange', update);
		document.addEventListener('webkitfullscreenchange', update);
		return () => {
			document.removeEventListener('fullscreenchange', update);
			document.removeEventListener('webkitfullscreenchange', update);
		};
	});

	function exitFullscreen() {
		const doc = document as FullscreenDoc;
		if (doc.fullscreenElement) void doc.exitFullscreen();
		else if (doc.webkitFullscreenElement) doc.webkitExitFullscreen?.();
	}

	function close() {
		exitFullscreen();
		index = null;
	}

	/** Klick auf den dunklen Rand neben dem eingepassten Bild? Dann schliessen. */
	function besideImage(e: MouseEvent) {
		const img = e.target;
		if (!(img instanceof HTMLImageElement) || !img.naturalWidth) return false;
		const r = img.getBoundingClientRect();
		const scale = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
		const w = img.naturalWidth * scale;
		const h = img.naturalHeight * scale;
		const x = e.clientX - r.left - (r.width - w) / 2;
		const y = e.clientY - r.top - (r.height - h) / 2;
		return x < 0 || y < 0 || x > w || y > h;
	}

	function toggleFullscreen() {
		if (isFullscreen) return exitFullscreen();
		const el = root as FullscreenEl | undefined;
		if (el?.requestFullscreen) void el.requestFullscreen().catch(() => {});
		else el?.webkitRequestFullscreen?.();
	}

	function onkeydown(e: KeyboardEvent) {
		if (index === null) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight') go(1);
		else if (e.key === 'ArrowLeft') go(-1);
		else if (e.key === 'i') toggleInfo();
		else if (voting && /^[1-5]$/.test(e.key) && photo && !photo.isOwn)
			onrate?.(photo, Number(e.key));
	}

	// Kein Scrollen der Seite im Hintergrund
	$effect(() => {
		if (index === null) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});
</script>

<svelte:window {onkeydown} />

{#if photo}
	<div
		class="lightbox"
		bind:this={root}
		bind:clientWidth={viewW}
		bind:clientHeight={viewH}
		role="dialog"
		aria-modal="true"
		aria-label="Foto im Vollbild"
		tabindex="-1"
		ontouchstart={(e) => (touchX = e.touches[0].clientX)}
		ontouchend={(e) => {
			if (touchX === null) return;
			const dx = e.changedTouches[0].clientX - touchX;
			if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
			touchX = null;
		}}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="stage" onclick={(e) => (e.target === e.currentTarget || besideImage(e)) && close()}>
			{#key photo.id}
				<img src={photoSrc(photo.id, 2400)} alt="" />
			{/key}
		</div>

		<div class="top">
			<span class="count">{index! + 1} / {photos.length}</span>
			<div class="actions">
				<button
					class:on={showInfo}
					onclick={toggleInfo}
					aria-label="Aufnahmedaten"
					aria-pressed={showInfo}
					title="Aufnahmedaten (i)"
				>
					<Info size={20} />
				</button>
				{#if canFullscreen}
					<button
						onclick={toggleFullscreen}
						aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
						title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
					>
						{#if isFullscreen}<Minimize size={20} />{:else}<Maximize size={20} />{/if}
					</button>
				{/if}
				<button onclick={close} aria-label="Schliessen" title="Schliessen (Esc)">
					<X size={22} />
				</button>
			</div>
		</div>

		{#if showInfo && infoPlace}
			<div class="info {infoPlace.kind}" style={infoPlace.style}>
				{#if meta}
					{#if exposure.length}
						<p class="exposure">
							{#each exposure as part (part)}<span>{part}</span>{/each}
						</p>
					{:else}
						<p class="faint">Keine Aufnahmedaten</p>
					{/if}
					{#if gear.length}
						<p class="faint parts">
							{#each gear as part (part)}<span>{part}</span>{/each}
						</p>
					{/if}
					<p class="faint parts">
						{#each when.filter(Boolean) as part (part)}<span>{part}</span>{/each}
						{#if !onDetailPage}<span><a href="/foto/{photo.id}">Alle Details</a></span>{/if}
					</p>
				{/if}
			</div>
		{/if}

		{#if photos.length > 1}
			<button class="nav prev" onclick={() => go(-1)} aria-label="Vorheriges Foto">
				<ChevronLeft size={30} strokeWidth={1.3} />
			</button>
			<button class="nav next" onclick={() => go(1)} aria-label="Nächstes Foto">
				<ChevronRight size={30} strokeWidth={1.3} />
			</button>
		{/if}

		<div class="bottom">
			{#if voting && !photo.isOwn}
				{#key photo.id}
					<Stars value={photo.myStars} size={26} onrate={(s) => onrate?.(photo, s)} />
				{/key}
			{:else if photo.userName}
				{#if photo.userId}
					<a class="who" href="/person/{photo.userId}" onclick={close}>{photo.userName}</a>
				{:else}
					<span>{photo.userName}</span>
				{/if}
				{#if photo.theme}<span class="dim">{photo.theme.title}</span>{/if}
				{#if photo.badge}
					<span class="dim">{photo.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}</span>
				{/if}
				{#if photo.average !== null && photo.votes}
					<span class="dim">★ {photo.average.toFixed(1)} · {photo.votes} Stimmen</span>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Farben folgen dem Erscheinungsbild: dunkel schwarz, hell der helle Grund */
	.lightbox {
		--lb-bg: #000;
		--lb-fg: #eee;
		--lb-strong: #f2f2f2;
		--lb-soft: #c8c8c8;
		--lb-dim: #8a8a8a;
		--lb-hover: rgb(255 255 255 / 0.08);
		--lb-on: rgb(255 255 255 / 0.14);
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--lb-bg);
		color: var(--lb-fg);
		outline: none;
	}

	:global([data-theme='light']) .lightbox {
		--lb-bg: var(--bg);
		--lb-fg: var(--text);
		--lb-strong: var(--text);
		--lb-soft: color-mix(in srgb, var(--text) 75%, var(--muted));
		--lb-dim: var(--muted);
		--lb-hover: rgb(0 0 0 / 0.06);
		--lb-on: rgb(0 0 0 / 0.1);
	}

	.stage {
		position: absolute;
		inset: 0;
		padding: 56px 0 64px;
	}

	/* Füllt den Bereich zwischen den Leisten; contain zeigt das Bild immer ganz.
	   (max-height: 100% greift in einem Grid nicht, daher feste Grösse.) */
	.stage img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		animation: fade 0.25s ease;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.top,
	.bottom {
		position: absolute;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		padding: 12px 16px;
		gap: 16px;
	}

	.top {
		top: 0;
		justify-content: space-between;
		padding-top: max(12px, var(--safe-top));
	}

	.bottom {
		bottom: 0;
		justify-content: center;
		min-height: 64px;
		padding-bottom: max(12px, env(safe-area-inset-bottom));
		font-size: 15px;
	}

	.who {
		color: inherit;
	}

	.who:hover {
		text-decoration: underline;
	}

	.count,
	.dim {
		color: var(--lb-dim);
		font-size: 13px;
	}

	.actions {
		display: flex;
		gap: 4px;
	}

	.actions a,
	.actions button,
	.nav {
		display: grid;
		place-items: center;
		background: none;
		border: 0;
		color: var(--lb-fg);
		cursor: pointer;
		padding: 8px;
		border-radius: 999px;
	}

	.actions a:hover,
	.actions button:hover,
	.nav:hover {
		background: var(--lb-hover);
	}

	.actions button.on {
		background: var(--lb-on);
		color: var(--lb-strong);
	}

	/* Aufnahmedaten: schlicht, im freien Rand neben oder unter dem Bild */
	.info {
		position: absolute;
		display: grid;
		gap: 3px;
		font-size: 12.5px;
		line-height: 1.4;
		color: var(--lb-soft);
		pointer-events: none;
		animation: fade 0.2s ease;
	}

	.info p {
		margin: 0;
	}

	.info a {
		color: var(--lb-soft);
		text-decoration: underline;
		text-underline-offset: 2px;
		pointer-events: auto;
	}

	.exposure {
		display: flex;
		flex-wrap: wrap;
		gap: 2px 12px;
		font-size: 14px;
		font-weight: 500;
		color: var(--lb-strong);
		font-variant-numeric: tabular-nums;
	}

	.faint {
		color: var(--lb-dim);
	}

	/* Teile mit «·» getrennt; in der Seitenspalte untereinander */
	.parts span + span::before {
		content: ' · ';
	}

	.info.side .parts span {
		display: block;
	}

	.info.side .parts span + span::before {
		content: none;
	}

	.info.side .parts {
		display: grid;
		gap: 3px;
	}

	.info.below {
		justify-items: center;
		text-align: center;
	}

	.info.below .exposure {
		justify-content: center;
	}

	/* Kein freier Rand: Leiste über der Bildunterkante mit sanftem Verlauf */
	.info.overlay {
		--lb-strong: #f2f2f2;
		--lb-soft: #c8c8c8;
		--lb-dim: #b8b8b8;
		padding: 48px 16px 12px;
		background: linear-gradient(to top, rgb(0 0 0 / 0.8) 30%, rgb(0 0 0 / 0));
		text-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
	}

	.info.overlay .faint {
		color: #b8b8b8;
	}

	.nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		padding: 12px;
	}

	.prev {
		left: 8px;
	}

	.next {
		right: 8px;
	}

	.bottom :global(button) {
		color: var(--lb-dim);
	}

	.bottom :global(button.on) {
		color: var(--accent);
	}

	@media (max-width: 720px), (hover: none) {
		.nav {
			display: none;
		}
	}
</style>
