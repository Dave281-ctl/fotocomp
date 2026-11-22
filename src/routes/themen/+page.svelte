<script lang="ts">
	import { enhance } from '$app/forms';
	import { themeSummary } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const isMine = (id: number) => data.myThemeIds.includes(id);
</script>

<svelte:head><title>Themen · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 40px">
	<div class="row" style="justify-content: space-between">
		<div class="stack" style="--gap: 6px">
			<p class="eyebrow">Themen</p>
			<h1>Wähle deine Themen</h1>
		</div>
		{#if data.canCreate}<a class="btn" href="/themen/neu">Neues Thema</a>{/if}
	</div>

	{#if data.open.length === 0}
		<p class="muted">Im Moment läuft kein Thema.</p>
	{/if}

	<div class="list">
		{#each data.open as theme (theme.id)}
			<article class="card stack" class:mine={isMine(theme.id)}>
				<div class="row" style="justify-content: space-between">
					<a href="/themen/{theme.id}"><h2>{theme.title}</h2></a>
					{#if isMine(theme.id)}
						<span class="badge accent">Du machst mit</span>
					{:else if theme.phase === 'upcoming'}
						<span class="badge">Startet bald</span>
					{/if}
				</div>
				{#if theme.description}<p>{theme.description}</p>{/if}
				<p class="muted small">
					{themeSummary(theme).join(' · ')} · {theme.members}
					{theme.members === 1 ? 'Teilnehmer' : 'Teilnehmende'}
				</p>
				<form method="POST" use:enhance>
					<input type="hidden" name="id" value={theme.id} />
					{#if isMine(theme.id)}
						<button class="btn ghost small" formaction="?/leave">Verlassen</button>
					{:else}
						<button class="btn primary small" formaction="?/join">Mitmachen</button>
					{/if}
				</form>
			</article>
		{/each}
	</div>

	{#if data.past.length}
		<section class="stack">
			<h2 class="muted">Vergangene Themen</h2>
			{#each data.past as theme (theme.id)}
				<a class="row past" href="/galerie?thema={theme.id}">
					<span>{theme.title}</span>
					<span class="muted small">{themeSummary(theme)[0]}</span>
				</a>
			{/each}
		</section>
	{/if}
</div>

<style>
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 16px;
	}

	.card.mine {
		outline: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
	}

	.past {
		justify-content: space-between;
		padding: 12px 0;
		border-bottom: 1px solid var(--line);
	}
</style>
