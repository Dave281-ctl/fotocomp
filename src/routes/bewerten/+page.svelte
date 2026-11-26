<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { CircleCheck } from '@lucide/svelte';
	import Lightbox from '#lib/components/Lightbox.svelte';
	import PhotoFeed from '#lib/components/PhotoFeed.svelte';
	import { formatDay, formatTime } from '#lib/schedule.ts';
	import type { FeedPhoto } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Eigene Sterne: lokal sofort zeigen und behalten, auch wenn die Seite ihre
	// Daten neu bekommt (sonst würde der alte Stand vom Laden die Anzeige überschreiben)
	let mine = $state<Record<number, number | null>>({});
	const withMine = (p: FeedPhoto): FeedPhoto => (p.id in mine ? { ...p, myStars: mine[p.id] } : p);
	const sections = $derived(data.sections.map((s) => ({ ...s, photos: s.photos.map(withMine) })));
	const all = $derived(sections.flatMap((s) => s.photos));

	const progress = (photos: FeedPhoto[]) => {
		const toRate = photos.filter((p) => !p.isOwn);
		return { rated: toRate.filter((p) => p.myStars !== null).length, total: toRate.length };
	};
	const overall = $derived(progress(all));

	let index = $state<number | null>(null);
	let error = $state('');

	async function rate(photo: FeedPhoto, stars: number) {
		const previous = photo.myStars;
		mine[photo.id] = stars;
		error = '';
		const res = await fetch('/api/vote', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ photoId: photo.id, stars })
		});
		if (!res.ok) {
			mine[photo.id] = previous;
			error = 'Die Bewertung konnte nicht gespeichert werden. Ist die Bewertungszeit vorbei?';
		} else {
			// Zähler bei «Heute» nachführen
			void invalidate('app:todos');
		}
	}
</script>

<svelte:head><title>Bewerten · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 28px">
	<header class="stack" style="--gap: 8px">
		<p class="eyebrow">Heute Abend</p>
		<h1>Fotos bewerten</h1>
		{#if sections.length}
			<p class="muted small intro">
				Gib jedem Foto 1–5 Sterne. Anonym bis zur Enthüllung um 05:00 Uhr – dann siehst du, wer was
				fotografiert hat.
			</p>
		{/if}
	</header>

	{#if !sections.length}
		<p class="notice">
			Im Moment gibt es nichts zu bewerten. Bewertet wird jeden Abend ab 20:00 Uhr bis am Morgen um
			05:00 Uhr.
		</p>
	{:else}
		<!-- Gesamtstand über alle Themen -->
		<p class="overall" class:done={overall.rated === overall.total}>
			{#if overall.rated === overall.total}
				<CircleCheck size={18} /> Alle {overall.total} Fotos bewertet – danke!
			{:else}
				{overall.rated} von {overall.total} Fotos bewertet
				{#if sections.length > 1}<span class="muted">· in {sections.length} Themen</span>{/if}
			{/if}
		</p>
		{#if error}<p class="error">{error}</p>{/if}

		{#each sections as s (s.theme.id)}
			{@const p = progress(s.photos)}
			<section id="thema-{s.theme.id}" class="stack" style="--gap: 14px">
				<!-- Kleiner Titel: markiert den Abschnitt eines Themas, bleibt beim Scrollen oben -->
				<div class="section-head">
					<a href="/themen/{s.theme.id}"><strong>{s.theme.title}</strong></a>
					<span class="muted small">{formatDay(s.day)} · bis {formatTime(s.endsAt)} Uhr</span>
					<span class="badge" class:accent={p.rated === p.total}>
						{p.rated === p.total ? '✓ ' : ''}{p.rated} / {p.total}
					</span>
				</div>
				<PhotoFeed
					photos={s.photos}
					voting
					onopen={(i) => (index = all.indexOf(s.photos[i]))}
					onrate={rate}
				/>
			</section>
		{/each}
		<Lightbox photos={all} bind:index voting onrate={rate} />
	{/if}
</div>

<style>
	.intro {
		margin: 0;
		max-width: 560px;
	}

	.overall {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 12px 16px;
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
		color: var(--accent);
		font-weight: 600;
	}

	.overall.done {
		background: color-mix(in srgb, var(--ok) 12%, var(--surface));
		color: var(--ok);
	}

	.section-head {
		position: sticky;
		top: var(--nav-h);
		z-index: 5;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 12px;
		margin: 0 calc(-1 * var(--gutter));
		padding: 10px var(--gutter);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--line);
	}

	@media (max-width: 720px) {
		.section-head {
			top: 0;
		}
	}

	.section-head strong {
		font-size: 17px;
	}

	.section-head a:hover strong {
		text-decoration: underline;
	}

	.section-head .badge {
		margin-left: auto;
	}
</style>
