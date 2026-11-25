<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Lightbox from '#lib/components/Lightbox.svelte';
	import PhotoFeed from '#lib/components/PhotoFeed.svelte';
	import SubHeader from '#lib/components/SubHeader.svelte';
	import { formatDay, formatTime } from '#lib/schedule.ts';
	import type { FeedPhoto } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const phase = $derived(data.phase);

	// Bewertung: lokal sofort anzeigen, im Hintergrund speichern
	let photos = $derived(data.votingPhotos);
	let index = $state<number | null>(null);
	let voteError = $state('');
	const toRate = $derived(photos.filter((p) => !p.isOwn));
	const rated = $derived(toRate.filter((p) => p.myStars !== null).length);

	async function rate(photo: FeedPhoto, stars: number) {
		const previous = photo.myStars;
		const set = (value: number | null) =>
			(photos = photos.map((p) => (p.id === photo.id ? { ...p, myStars: value } : p)));
		set(stars);
		const res = await fetch('/api/vote', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ photoId: photo.id, stars })
		});
		if (!res.ok) {
			set(previous);
			voteError = 'Die Bewertung konnte nicht gespeichert werden. Ist die Bewertungszeit vorbei?';
		} else {
			// Zähler «Heute» nachführen (die Sterne gehen nicht über ein Formular)
			void invalidate('app:todos');
		}
	}
</script>

<svelte:head><title>Bewerten · {data.theme.title} · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 28px">
	<SubHeader
		theme={data.theme}
		eyebrow={phase.kind === 'voting' ? formatDay(phase.day) : undefined}
		title="Fotos bewerten"
	/>

	{#if phase.kind !== 'voting'}
		<p class="notice">
			Bewertet wird jeden Abend ab 20:00 Uhr bis am Morgen um 05:00 Uhr. Im Moment gibt es nichts zu
			bewerten.
		</p>
	{:else if photos.length === 0}
		<p class="muted">Heute wurden keine Fotos hochgeladen.</p>
	{:else}
		<div class="row status">
			<p class="muted small">
				Gib jedem Foto 1–5 Sterne. Anonym bis {formatTime(phase.endsAt)} Uhr – danach wird enthüllt, wer
				was fotografiert hat.
			</p>
			{#if toRate.length}
				<span class="badge" class:accent={rated === toRate.length}>
					{rated === toRate.length ? '✓ ' : ''}{rated} / {toRate.length} bewertet
				</span>
			{/if}
		</div>
		{#if voteError}<p class="error">{voteError}</p>{/if}
		<PhotoFeed {photos} voting onopen={(i) => (index = i)} onrate={rate} />
		<Lightbox {photos} bind:index voting onrate={rate} />
	{/if}
</div>

<style>
	.status {
		justify-content: space-between;
	}

	.status p {
		margin: 0;
		max-width: 560px;
	}
</style>
