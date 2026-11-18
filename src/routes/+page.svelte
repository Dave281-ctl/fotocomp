<script lang="ts">
	import { formatDay, formatTime } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
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
			<p class="notice">
				Das Thema startet am {formatDay(data.theme.startDate)}.
			</p>
		{:else if phase.kind === 'upload'}
			<p class="notice">Lade dein Foto des Tages bis {formatTime(phase.endsAt)} Uhr hoch.</p>
		{:else if phase.kind === 'voting'}
			<p class="notice">Bewertung läuft bis {formatTime(phase.endsAt)} Uhr.</p>
		{:else if phase.kind === 'weekly'}
			<p class="notice">Heute wird das Wochenfoto gewählt.</p>
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
</style>
