<script lang="ts">
	import { ChevronRight, MessageCircle } from '@lucide/svelte';
	import { photoSrc } from '../media.ts';
	import type { NewsItem } from '../types.ts';

	/** Neuigkeiten: kleines Bild, Titel, Text, wann. Ungesehenes mit Punkt. */
	let { news }: { news: NewsItem[] } = $props();
</script>

<ul class="news">
	{#each news as item (item.kind + item.href + item.at)}
		<li>
			<a href={item.href} class="item">
				<span class="thumb">
					{#if item.photoId}
						<img src={photoSrc(item.photoId, 480)} alt="" loading="lazy" />
					{:else}
						<MessageCircle size={18} />
					{/if}
					{#if item.isNew}<span class="new" title="Neu"></span>{/if}
				</span>
				<span class="text">
					<span class="title">{item.title}</span>
					<span class="body">{item.text}</span>
					<span class="when">{item.when}</span>
				</span>
				<ChevronRight size={18} class="chevron" />
			</a>
		</li>
	{/each}
</ul>

<style>
	.news {
		display: grid;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.item {
		display: grid;
		grid-template-columns: 48px 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 8px 14px;
		border-radius: var(--radius-sm);
		transition: background 0.15s;
	}

	.item:hover {
		background: var(--surface-2);
	}

	.thumb {
		position: relative;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: var(--surface-2);
		color: var(--muted);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: inherit;
	}

	.new {
		position: absolute;
		top: -3px;
		right: -3px;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 2px var(--surface);
	}

	.text {
		display: grid;
		gap: 1px;
		min-width: 0;
	}

	.title {
		font-weight: 500;
	}

	.body {
		font-size: 14px;
		color: color-mix(in srgb, var(--text) 75%, var(--muted));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.when {
		font-size: 12px;
		color: var(--muted);
	}

	.item :global(.chevron) {
		color: var(--muted);
	}
</style>
