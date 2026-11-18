<script lang="ts">
	import { enhance } from '$app/forms';
	import Lightbox from '#lib/components/Lightbox.svelte';
	import PhotoFeed from '#lib/components/PhotoFeed.svelte';
	import Uploader from '#lib/components/Uploader.svelte';
	import { photoSrc, photoSrcset } from '#lib/media.ts';
	import { formatDay, formatTime } from '#lib/schedule.ts';
	import type { FeedPhoto } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let replacing = $state(false);

	// Bewertung: lokal sofort anzeigen, im Hintergrund speichern
	let votingPhotos = $derived(data.theme ? data.votingPhotos : []);
	let votingIndex = $state<number | null>(null);
	let resultIndex = $state<number | null>(null);
	let voteError = $state('');
	const toRate = $derived(votingPhotos.filter((p) => !p.isOwn));
	const rated = $derived(toRate.filter((p) => p.myStars !== null).length);

	async function rate(photo: FeedPhoto, stars: number) {
		const previous = photo.myStars;
		const set = (value: number | null) =>
			(votingPhotos = votingPhotos.map((p) => (p.id === photo.id ? { ...p, myStars: value } : p)));
		set(stars);
		const res = await fetch('/api/vote', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ photoId: photo.id, stars })
		});
		if (!res.ok) {
			set(previous);
			voteError = 'Die Bewertung konnte nicht gespeichert werden. Ist die Bewertungszeit vorbei?';
		}
	}
</script>

<svelte:head><title>Heute · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 40px">
	{#if !data.theme}
		<div class="stack empty" style="--gap: 16px">
			<p class="eyebrow">Willkommen, {data.user?.name}</p>
			<h1>Wähle ein Thema, um loszulegen.</h1>
			<p class="muted">Jeden Tag ein Foto zum Thema, am Abend wird gegenseitig bewertet.</p>
			<div><a class="btn primary" href="/themen">Zu den Themen</a></div>
		</div>
	{:else}
		{@const phase = data.phase}
		<header class="stack" style="--gap: 10px">
			<p class="eyebrow">
				{#if phase.kind === 'upload' || phase.kind === 'voting' || phase.kind === 'weekly'}
					{formatDay(phase.day)}
				{:else}
					Thema
				{/if}
			</p>
			<h1>{data.theme.title}</h1>
			{#if data.theme.description}<p class="lead">{data.theme.description}</p>{/if}
		</header>

		{#if phase.kind === 'upcoming'}
			<p class="notice">Das Thema startet am {formatDay(data.theme.startDate)}.</p>
		{:else if phase.kind === 'upload'}
			<section class="stack">
				{#if data.myPhoto && !replacing}
					<figure class="mine">
						<img
							src={photoSrc(data.myPhoto.id)}
							srcset={photoSrcset(data.myPhoto.id)}
							sizes="(max-width: 1080px) 100vw, 1080px"
							alt="Dein Foto des Tages"
						/>
					</figure>
					<div class="row" style="justify-content: space-between">
						<p class="muted">
							Dein Foto ist bereit. Ab {formatTime(phase.endsAt)} Uhr sehen es die anderen.
						</p>
						<div class="row" style="--gap: 4px">
							<button class="btn small" onclick={() => (replacing = true)}>Ersetzen</button>
							<form
								method="POST"
								action="?/deletePhoto"
								use:enhance={({ cancel }) => {
									if (!confirm('Foto wirklich löschen?')) cancel();
								}}
							>
								<button class="btn danger small">Löschen</button>
							</form>
						</div>
					</div>
				{:else}
					<p class="muted">Lade dein Foto des Tages bis {formatTime(phase.endsAt)} Uhr hoch.</p>
					<Uploader
						feedbackDefault={data.feedbackDefault}
						replacing={!!data.myPhoto}
						error={form?.uploadError}
					/>
					{#if replacing}
						<div>
							<button class="btn ghost small" onclick={() => (replacing = false)}>Abbrechen</button>
						</div>
					{/if}
				{/if}
			</section>
		{:else if phase.kind === 'voting'}
			<section class="stack" style="--gap: 24px">
				<div class="row" style="justify-content: space-between">
					<div class="stack" style="--gap: 4px">
						<h2>Bewerte die Fotos von heute</h2>
						<p class="muted small">
							Anonym bis {formatTime(phase.endsAt)} Uhr · danach wird enthüllt, wer was fotografiert hat.
						</p>
					</div>
					{#if toRate.length}
						<span class="badge" class:accent={rated === toRate.length}>
							{rated} / {toRate.length} bewertet
						</span>
					{/if}
				</div>
				{#if voteError}<p class="error">{voteError}</p>{/if}
				{#if votingPhotos.length}
					<PhotoFeed photos={votingPhotos} voting onopen={(i) => (votingIndex = i)} onrate={rate} />
					<Lightbox photos={votingPhotos} bind:index={votingIndex} voting onrate={rate} />
				{:else}
					<p class="muted">Heute wurden keine Fotos hochgeladen.</p>
				{/if}
			</section>
		{:else if phase.kind === 'weekly'}
			<p class="notice">Heute wird das Wochenfoto gewählt.</p>
		{/if}

		{#if data.resultDay && data.results.length}
			<section class="stack" style="--gap: 24px">
				<hr class="divider" />
				<div class="stack" style="--gap: 4px">
					<p class="eyebrow">Resultat</p>
					<h2>{formatDay(data.resultDay)}</h2>
				</div>
				<PhotoFeed photos={data.results} onopen={(i) => (resultIndex = i)} />
				<Lightbox photos={data.results} bind:index={resultIndex} />
			</section>
		{/if}
	{/if}
</div>

<style>
	.empty {
		max-width: 560px;
		padding-top: 10vh;
	}

	.lead {
		font-size: 18px;
		max-width: 640px;
	}

	figure {
		margin: 0;
		background: var(--photo-bg);
		border-radius: var(--radius);
		overflow: hidden;
	}

	figure img {
		width: 100%;
		max-height: 75vh;
		object-fit: contain;
	}
</style>
