<script lang="ts">
	import { goto } from '$app/navigation';
	import Lightbox from '#lib/components/Lightbox.svelte';
	import PhotoFeed from '#lib/components/PhotoFeed.svelte';
	import { formatDay } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Ein Vollbild über alle Fotos der Seite
	const all = $derived(data.days.flatMap((d) => d.photos));
	const offsets = $derived(
		data.days.map((_, i) => data.days.slice(0, i).reduce((n, d) => n + d.photos.length, 0))
	);
	let index = $state<number | null>(null);
</script>

<svelte:head><title>Galerie · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 48px">
	<div class="row" style="justify-content: space-between; align-items: flex-end">
		<div class="stack" style="--gap: 6px">
			<p class="eyebrow">Galerie</p>
			<h1>{data.themes.find((t) => t.id === data.themeId)?.title ?? 'Noch keine Fotos'}</h1>
		</div>
		{#if data.themes.length > 1}
			<select
				aria-label="Thema wählen"
				value={data.themeId}
				onchange={(e) => goto(`/galerie?thema=${e.currentTarget.value}`)}
			>
				{#each data.themes as theme (theme.id)}
					<option value={theme.id}>{theme.title}</option>
				{/each}
			</select>
		{/if}
	</div>

	{#if data.days.length === 0}
		<p class="muted">
			Hier erscheinen die Fotos, sobald die erste Tagesrunde enthüllt ist (jeweils um 05:00 Uhr).
		</p>
	{/if}

	{#each data.days as group, i (group.day)}
		<section class="stack" style="--gap: 20px">
			<h2 class="day">{formatDay(group.day)}</h2>
			<PhotoFeed photos={group.photos} onopen={(j) => (index = offsets[i] + j)} />
		</section>
	{/each}

	{#if data.more}
		<div>
			<a class="btn" href="/galerie?thema={data.themeId}&bis={data.more}">Ältere Tage</a>
		</div>
	{/if}
</div>

<Lightbox photos={all} bind:index />

<style>
	select {
		width: auto;
		min-width: 180px;
	}

	.day {
		font-size: 15px;
		font-weight: 500;
		color: var(--muted);
		letter-spacing: 0;
	}
</style>
