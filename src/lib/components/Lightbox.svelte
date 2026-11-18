<script lang="ts">
	import { ChevronLeft, ChevronRight, Info, Maximize, X } from '@lucide/svelte';
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
	const go = (step: number) => {
		if (index === null) return;
		index = (index + step + photos.length) % photos.length;
	};

	function close() {
		if (document.fullscreenElement) document.exitFullscreen();
		index = null;
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) document.exitFullscreen();
		else root?.requestFullscreen?.();
	}

	function onkeydown(e: KeyboardEvent) {
		if (index === null) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight') go(1);
		else if (e.key === 'ArrowLeft') go(-1);
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
		<div class="stage" onclick={(e) => e.target === e.currentTarget && close()}>
			{#key photo.id}
				<img src={photoSrc(photo.id, 2400)} alt="" />
			{/key}
		</div>

		<div class="top">
			<span class="count">{index! + 1} / {photos.length}</span>
			<div class="actions">
				<a href="/foto/{photo.id}" aria-label="Details" title="Details & Metadaten">
					<Info size={20} />
				</a>
				<button onclick={toggleFullscreen} aria-label="Vollbild" title="Vollbild">
					<Maximize size={20} />
				</button>
				<button onclick={close} aria-label="Schliessen" title="Schliessen (Esc)">
					<X size={22} />
				</button>
			</div>
		</div>

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
				<Stars value={photo.myStars} size={26} onrate={(s) => onrate?.(photo, s)} />
			{:else if photo.userName}
				<span>{photo.userName}</span>
				{#if photo.average !== null && photo.votes}
					<span class="dim">★ {photo.average.toFixed(1)} · {photo.votes} Stimmen</span>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: #000;
		color: #eee;
		outline: none;
	}

	.stage {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 56px 0 64px;
	}

	.stage img {
		max-width: 100%;
		max-height: 100%;
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
		padding-top: max(12px, env(safe-area-inset-top));
	}

	.bottom {
		bottom: 0;
		justify-content: center;
		min-height: 64px;
		padding-bottom: max(12px, env(safe-area-inset-bottom));
		font-size: 15px;
	}

	.count,
	.dim {
		color: #8a8a8a;
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
		color: #ddd;
		cursor: pointer;
		padding: 8px;
		border-radius: 999px;
	}

	.actions a:hover,
	.actions button:hover,
	.nav:hover {
		background: rgb(255 255 255 / 0.08);
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
		color: #777;
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
