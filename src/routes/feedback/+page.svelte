<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check } from '@lucide/svelte';
	import { photoSrc } from '#lib/media.ts';
	import { formatDay, formatShortDay, formatTime, zurichParts } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const when = (d: Date) => `${formatDay(zurichParts(d).date)}, ${formatTime(d)} Uhr`;
	const open = $derived(data.round ? data.photos.filter((p) => !p.feedbackGiven).length : 0);
</script>

<svelte:head><title>Feedback-Runde · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 32px">
	<div class="stack" style="--gap: 8px">
		<p class="eyebrow">Feedback-Runde · {data.theme.title}</p>
		<h1>Gemeinsam besser werden</h1>
		<p class="muted lead">
			In einer Feedback-Runde geben sich alle Teilnehmenden gegenseitig freundschaftliches,
			konstruktives Feedback zu den Fotos der letzten Woche.
		</p>
	</div>

	{#if !data.round}
		<p class="muted">Im Moment ist keine Feedback-Runde geplant.</p>
	{:else}
		<p class="notice">
			{#if data.active}
				Läuft bis {when(data.round.endsAt)}.
			{:else}
				Beginnt am {when(data.round.startsAt)}.
			{/if}
		</p>

		<form method="POST" action="?/participate" class="row" use:enhance>
			{#if data.participating === null}
				<span>Machst du mit?</span>
			{:else}
				<span class="muted">
					{data.participating ? 'Du machst mit.' : 'Du machst diesmal nicht mit.'}
					{#if data.always}(immer){/if}
				</span>
			{/if}
			<div class="row" style="--gap: 6px">
				{#if data.participating !== true || data.always}
					<button class="btn small primary" name="answer" value="yes">Ich mache mit</button>
				{/if}
				{#if !data.always}
					<button class="btn small" name="answer" value="always">Immer mitmachen</button>
				{/if}
				{#if data.participating !== false}
					<button class="btn small ghost" name="answer" value="no">Diesmal nicht</button>
				{/if}
			</div>
		</form>

		{#if data.active && data.participating}
			<section class="stack" style="--gap: 16px">
				<h2>
					{open
						? `${open} ${open === 1 ? 'Foto wartet' : 'Fotos warten'} auf dein Feedback`
						: 'Alles erledigt – danke!'}
				</h2>
				<div class="grid">
					{#each data.photos as photo (photo.id)}
						<a class="tile" href="/foto/{photo.id}">
							<img src={photoSrc(photo.id, 480)} alt="" loading="lazy" />
							<span class="caption row" style="--gap: 6px">
								{#if photo.feedbackGiven}<Check size={14} />{/if}
								{photo.userName} · {formatShortDay(photo.day)}
							</span>
						</a>
					{:else}
						<p class="muted">Noch keine Fotos von anderen Teilnehmenden.</p>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.lead {
		max-width: 620px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 16px;
	}

	.tile img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--photo-bg);
	}

	.caption {
		padding-top: 6px;
		font-size: 13px;
		color: var(--muted);
	}
</style>
