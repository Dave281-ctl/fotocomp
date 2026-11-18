<script lang="ts">
	import { Expand } from '@lucide/svelte';
	import { photoSrc, photoSrcset } from '../media.ts';
	import type { FeedPhoto } from '../types.ts';
	import Avatar from './Avatar.svelte';
	import Stars from './Stars.svelte';

	let {
		photos,
		voting = false,
		picks,
		onopen,
		onrate,
		onpick
	}: {
		photos: FeedPhoto[];
		/** Bewertungsmodus: Namen verborgen, Sterne unter jedem fremden Foto. */
		voting?: boolean;
		/** Wochenbewertung: gewählte Foto-IDs in der Reihenfolge der Plätze. */
		picks?: number[];
		onopen: (index: number) => void;
		onrate?: (photo: FeedPhoto, stars: number) => void;
		onpick?: (photo: FeedPhoto) => void;
	} = $props();

	const picking = $derived(picks !== undefined);
</script>

<!--
	Ausgerichtetes Raster ohne Beschnitt: Jedes Foto wächst proportional zu
	seinem Seitenverhältnis, so füllen die Zeilen die Breite.
-->
<div class="feed">
	{#each photos as photo, i (photo.id)}
		{@const ratio = photo.width / photo.height}
		{@const place = picks ? picks.indexOf(photo.id) + 1 : 0}
		<figure style="--ratio: {ratio}" class:picked={place > 0}>
			<button
				class="image"
				class:pickable={picking && !photo.isOwn}
				onclick={() => (picking ? !photo.isOwn && onpick?.(photo) : onopen(i))}
				aria-label={picking ? 'Foto wählen' : 'Foto gross anzeigen'}
			>
				<img
					src={photoSrc(photo.id)}
					srcset={photoSrcset(photo.id)}
					sizes="(max-width: 720px) 100vw, 50vw"
					alt=""
					loading={i < 4 ? 'eager' : 'lazy'}
					style="aspect-ratio: {ratio}"
				/>
				{#if place}<span class="place">{place}</span>{/if}
				{#if photo.rank === 1 && photo.votes && !voting && !picking}<span class="winner">
						Tagessieg
					</span>{/if}
			</button>
			{#if picking}
				<button class="expand" onclick={() => onopen(i)} aria-label="Gross anzeigen">
					<Expand size={16} />
				</button>
			{/if}
			<figcaption>
				{#if voting && !photo.isOwn}
					<Stars value={photo.myStars} onrate={(s) => onrate?.(photo, s)} />
				{:else if photo.userName}
					<a class="who" href="/foto/{photo.id}">
						<Avatar name={photo.userName} id={photo.userId} />
						<span>{photo.isOwn ? `${photo.userName} (du)` : photo.userName}</span>
					</a>
					{#if photo.average !== null}
						<span class="score muted small">
							{photo.votes ? `★ ${photo.average.toFixed(1)}` : '–'}
						</span>
					{/if}
				{/if}
			</figcaption>
		</figure>
	{/each}
</div>

<style>
	.feed {
		display: flex;
		flex-wrap: wrap;
		gap: 28px 12px;
	}

	/* Letzte Zeile nicht auf volle Breite ziehen */
	.feed::after {
		content: '';
		flex-grow: 1000;
	}

	figure {
		position: relative;
		margin: 0;
		flex-grow: var(--ratio);
		flex-basis: calc(var(--ratio) * 300px);
		min-width: 0;
	}

	.image {
		position: relative;
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: var(--photo-bg);
		border-radius: var(--radius-sm);
		overflow: hidden;
		cursor: zoom-in;
	}

	img {
		width: 100%;
		height: auto;
		transition: transform 0.4s ease;
	}

	.image:hover img {
		transform: scale(1.015);
	}

	.pickable {
		cursor: pointer;
	}

	.picked .image {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	.place {
		position: absolute;
		top: 12px;
		left: 12px;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		font-weight: 600;
		background: var(--accent);
		color: var(--accent-text);
	}

	.expand {
		position: absolute;
		top: 10px;
		right: 10px;
		display: grid;
		place-items: center;
		padding: 8px;
		border: 0;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.45);
		color: #fff;
		cursor: zoom-in;
	}

	.winner {
		position: absolute;
		top: 12px;
		left: 12px;
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: var(--accent);
		color: var(--accent-text);
	}

	figcaption {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 40px;
		padding-top: 8px;
	}

	.who {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 14px;
		font-weight: 500;
	}

	@media (max-width: 720px) {
		figure {
			flex-basis: 100%;
		}
	}
</style>
