<script lang="ts">
	import { enhance } from '$app/forms';
	import Lightbox from '#lib/components/Lightbox.svelte';
	import PhotoFeed from '#lib/components/PhotoFeed.svelte';
	import Podium from '#lib/components/Podium.svelte';
	import SubHeader from '#lib/components/SubHeader.svelte';
	import { WEEKDAYS, formatDay, formatTime } from '#lib/schedule.ts';
	import type { FeedPhoto } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const phase = $derived(data.phase);

	// Antippen vergibt den nächsten freien Platz, nochmals antippen entfernt
	let picks = $derived(data.myPicks);
	let dirty = $state(false);
	let index = $state<number | null>(null);
	function toggle(photo: FeedPhoto) {
		picks = picks.includes(photo.id)
			? picks.filter((id) => id !== photo.id)
			: picks.length < 3
				? [...picks, photo.id]
				: picks;
		dirty = true;
	}
</script>

<svelte:head><title>Wochenfoto · {data.theme.title} · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 28px">
	<SubHeader
		theme={data.theme}
		eyebrow={phase.kind === 'weekly' ? formatDay(phase.day) : undefined}
		title="Wochenfoto"
	/>

	{#if phase.kind === 'weekly'}
		<p class="muted small intro">
			Tippe deine drei Favoriten der Woche an: der erste erhält 3 Punkte, der zweite 2, der dritte
			1. Enthüllung um {formatTime(phase.endsAt)} Uhr.
		</p>
		{#if data.weekPhotos.length}
			<PhotoFeed photos={data.weekPhotos} {picks} onpick={toggle} onopen={(i) => (index = i)} />
			<Lightbox photos={data.weekPhotos} bind:index />
			<form
				method="POST"
				class="savebar row"
				use:enhance={() =>
					async ({ update }) => {
						await update({ reset: false });
						dirty = false;
					}}
			>
				<input type="hidden" name="picks" value={picks.join(',')} />
				<span class="muted small">
					{picks.length} von 3 gewählt
					{#if !dirty && form?.weeklySaved}· gespeichert ✓{/if}
				</span>
				{#if form?.weeklyError}<span class="error">{form.weeklyError}</span>{/if}
				<button class="btn accent" disabled={!dirty}>Wahl speichern</button>
			</form>
		{:else}
			<p class="muted">Diese Woche gibt es keine Fotos.</p>
		{/if}
	{:else if data.result}
		{@const result = data.result}
		<p class="muted">Resultat der Woche bis {formatDay(result.voteDay)}</p>
		{#if result.podium.length}
			<Podium photos={result.podium} />
		{:else}
			<p class="muted">Diese Woche wurden keine Stimmen abgegeben.</p>
		{/if}
		<section class="stack" style="--gap: 10px">
			<h2>Fotografen der Woche</h2>
			<ol class="ranking">
				{#each result.photographers as p (p.userId)}
					<li>
						<span class="rank">{p.rank}.</span>
						<a href="/person/{p.userId}">{p.name}</a>
						<span class="muted small">{p.total.toFixed(1)} ★ aus {p.days} Tagen</span>
					</li>
				{/each}
			</ol>
		</section>
	{:else}
		<p class="notice">
			{data.theme.weeklyVoteDay
				? `Das Wochenfoto wird jeweils am ${WEEKDAYS[data.theme.weeklyVoteDay - 1]} gewählt.`
				: 'In diesem Thema gibt es keine Wochenbewertung.'}
		</p>
	{/if}
</div>

<style>
	.intro {
		margin: 0;
		max-width: 560px;
	}

	.savebar {
		position: sticky;
		bottom: 16px;
		justify-content: space-between;
		padding: 12px 12px 12px 20px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface) 90%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	@media (max-width: 720px) {
		.savebar {
			bottom: calc(var(--nav-h) + 12px);
		}
	}

	.ranking {
		list-style: none;
		margin: 0;
		padding: 0;
		max-width: 480px;
	}

	.ranking li {
		display: grid;
		grid-template-columns: 32px 1fr auto;
		align-items: baseline;
		padding: 10px 0;
		border-bottom: 1px solid var(--line);
	}

	.rank {
		color: var(--muted);
	}
</style>
