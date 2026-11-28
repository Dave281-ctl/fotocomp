<script lang="ts">
	import { Trophy } from '@lucide/svelte';
	import { photoSrc } from '../media.ts';
	import { formatDay } from '../schedule.ts';
	import type { FeedPhoto } from '../types.ts';

	/** Alle Fotos eines Themas nach Tag, als dichtes Raster. Antippen öffnet die Fokus-Ansicht. */
	let { days }: { days: { day: string; photos: FeedPhoto[] }[] } = $props();
</script>

<div class="stack" style="--gap: 28px">
	{#each days as group (group.day)}
		<section id="tag-{group.day}" class="stack" style="--gap: 10px">
			<h3 class="muted">{formatDay(group.day)}</h3>
			<div class="grid">
				{#each group.photos as photo (photo.id)}
					<a class="tile" href="/foto/{photo.id}" aria-label="Foto ansehen">
						<img src={photoSrc(photo.id, 480)} alt="" loading="lazy" />
						{#if photo.badge}
							<span class="award" title={photo.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}>
								<Trophy size={12} />
							</span>
						{/if}
						<span class="caption">
							<span>{photo.userName}</span>
							{#if photo.average !== null}<span>★ {photo.average.toFixed(1)}</span>{/if}
						</span>
					</a>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 6px;
	}

	@media (max-width: 480px) {
		.grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 4px;
		}
	}

	.tile {
		position: relative;
		padding: 0;
		border: 0;
		border-radius: 6px;
		overflow: hidden;
		background: var(--photo-bg);
		cursor: zoom-in;
	}

	.tile img {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		transition: transform 0.3s;
	}

	.tile:hover img {
		transform: scale(1.04);
	}

	.award {
		position: absolute;
		top: 6px;
		left: 6px;
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.55);
		color: var(--accent);
	}

	/* Name und Sterne erst beim Darüberfahren (auf dem Handy im Vollbild) */
	.caption {
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		justify-content: space-between;
		gap: 6px;
		padding: 18px 8px 6px;
		font-size: 11px;
		color: #fff;
		text-align: left;
		background: linear-gradient(to top, rgb(0 0 0 / 0.65), transparent);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.caption span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tile:hover .caption,
	.tile:focus-visible .caption {
		opacity: 1;
	}
</style>
