<script lang="ts">
	import { photoSrc } from '../media.ts';
	import type { FeedPhoto } from '../types.ts';
	import Lightbox from './Lightbox.svelte';

	/**
	 * Siegertreppchen: Platz 2 – 1 – 3 nebeneinander, der Sieger in der Mitte
	 * und am höchsten. Darunter Name und Punkte bzw. Sterne.
	 */
	type PodiumPhoto = FeedPhoto & { place: number; points?: number };
	let { photos }: { photos: PodiumPhoto[] } = $props();

	const top = $derived(photos.slice(0, 3));
	// Anzeige-Reihenfolge 2 – 1 – 3 (bei nur zwei Fotos: 2 – 1)
	const order = $derived(
		top.length === 1 ? [top[0]] : top.length === 2 ? [top[1], top[0]] : [top[1], top[0], top[2]]
	);
	let index = $state<number | null>(null);
</script>

<div class="podium" style="--n: {order.length}">
	{#each order as photo (photo.id)}
		<div class="place place-{Math.min(photo.place, 3)}">
			<button
				class="photo"
				onclick={() => (index = top.indexOf(photo))}
				aria-label="Gross anzeigen"
			>
				<img src={photoSrc(photo.id, 1200)} alt="" loading="lazy" />
			</button>
			<div class="caption">
				<strong>{photo.userName}</strong>
				<span class="muted">
					{photo.points !== undefined
						? `${photo.points} ${photo.points === 1 ? 'Punkt' : 'Punkte'}`
						: `★ ${photo.average?.toFixed(1)}`}
				</span>
			</div>
			<div class="step">{photo.place}</div>
		</div>
	{/each}
</div>
<Lightbox photos={top} bind:index />

<style>
	.podium {
		display: grid;
		grid-template-columns: repeat(var(--n), 1fr);
		align-items: end;
		gap: clamp(6px, 2vw, 14px);
		max-width: 600px;
	}

	/* Der Sieger in der Mitte etwas breiter */
	.podium:has(.place-1) {
		grid-template-columns: 1fr 1.35fr 1fr;
	}

	.podium[style*='--n: 1'] {
		grid-template-columns: minmax(0, 420px);
	}

	.podium[style*='--n: 2'] {
		grid-template-columns: 1fr 1.35fr;
	}

	.place {
		margin: 0;
		display: grid;
		gap: 8px;
		min-width: 0;
	}

	.photo {
		display: block;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--photo-bg);
		cursor: zoom-in;
	}

	.photo img {
		width: 100%;
		aspect-ratio: 4 / 5;
		object-fit: cover;
		transition: transform 0.3s;
	}

	.photo:hover img {
		transform: scale(1.03);
	}

	.caption {
		display: grid;
		gap: 1px;
		font-size: 13px;
		text-align: center;
		min-width: 0;
	}

	.caption > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Die Stufen: 1 am höchsten, in Gold */
	.step {
		display: grid;
		place-items: center;
		border-radius: 6px 6px 0 0;
		background: var(--surface-2);
		color: var(--muted);
		font-weight: 600;
		font-size: 15px;
	}

	.place-1 .step {
		height: 52px;
		background: color-mix(in srgb, var(--accent) 28%, var(--surface));
		color: var(--accent);
		font-size: 18px;
	}

	.place-2 .step {
		height: 36px;
	}

	.place-3 .step {
		height: 24px;
	}
</style>
