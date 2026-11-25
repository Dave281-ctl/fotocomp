<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronRight, CircleCheck } from '@lucide/svelte';
	import InstallHint from '#lib/components/InstallHint.svelte';
	import NewsList from '#lib/components/NewsList.svelte';
	import TaskList from '#lib/components/TaskList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Erst nach dem Anzeigen als gesehen markieren (nicht schon beim Vorladen)
	onMount(() => {
		void fetch('/api/gesehen', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ at: data.seenAt })
		});
	});

	const active = $derived(data.groups.filter((g) => g.open || g.news.length));
	const quiet = $derived(data.groups.filter((g) => !g.open && !g.news.length));
</script>

<svelte:head><title>Heute · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 28px">
	<header class="stack" style="--gap: 6px">
		<p class="eyebrow">{data.day}</p>
		<h1>Heute</h1>
	</header>

	<InstallHint />

	{#if !data.groups.length && !data.chatNews.length}
		<div class="stack empty" style="--gap: 16px">
			<h2>Wähle ein Thema, um loszulegen.</h2>
			<p class="muted">Jeden Tag ein Foto zum Thema, am Abend wird gegenseitig bewertet.</p>
			<div><a class="btn primary" href="/themen">Zu den Themen</a></div>
		</div>
	{:else}
		<!-- Auf einen Blick: Gibt es etwas zu tun? -->
		{#if data.openTotal}
			<p class="summary open">
				<span class="ring" aria-hidden="true"></span>
				{data.openTotal}
				{data.openTotal === 1 ? 'Aufgabe wartet' : 'Aufgaben warten'} auf dich
			</p>
		{:else}
			<p class="summary done"><CircleCheck size={20} /> Alles erledigt</p>
		{/if}

		{#each active as g (g.theme.id)}
			<section class="card group stack" style="--gap: 10px">
				<a class="group-head row" href="/themen/{g.theme.id}">
					<h2>{g.theme.title}</h2>
					{#if g.open}
						<span class="chip open">{g.open} offen</span>
					{:else if g.tasks.length}
						<span class="chip done"><CircleCheck size={13} /> erledigt</span>
					{/if}
					<ChevronRight size={18} class="chevron" />
				</a>
				{#if g.tasks.length}<TaskList tasks={g.tasks} />{/if}
				{#if g.news.length}
					{#if g.tasks.length}<hr class="sep" />{/if}
					<NewsList news={g.news} />
				{/if}
			</section>
		{/each}

		{#if data.chatNews.length}
			<section class="card group stack" style="--gap: 10px">
				<a class="group-head row" href="/chat">
					<h2>Chat</h2>
					<ChevronRight size={18} class="chevron" />
				</a>
				<NewsList news={data.chatNews} />
			</section>
		{/if}

		{#if quiet.length}
			<div class="quiet">
				{#each quiet as g (g.theme.id)}
					<a class="row" href="/themen/{g.theme.id}">
						<span>{g.theme.title}</span>
						<span class="muted small">
							{g.upcoming ? `startet ${g.upcoming}` : 'nichts zu tun'}
						</span>
						<ChevronRight size={16} class="chevron" />
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.empty {
		padding-top: 6vh;
	}

	.summary {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		padding: 14px 18px;
		border-radius: var(--radius);
		font-weight: 600;
	}

	.summary.open {
		background: color-mix(in srgb, var(--accent) 14%, var(--surface));
		color: var(--accent);
	}

	.summary.done {
		background: color-mix(in srgb, var(--ok) 12%, var(--surface));
		color: var(--ok);
	}

	.ring {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.group {
		padding: 14px 8px 8px;
	}

	.group-head {
		--gap: 10px;
		padding: 0 10px 2px;
	}

	.group-head h2 {
		margin: 0;
		font-size: 18px;
	}

	.group-head :global(.chevron) {
		margin-left: auto;
		color: var(--muted);
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 9px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
	}

	.chip.open {
		background: var(--accent);
		color: var(--accent-text);
	}

	.chip.done {
		color: var(--ok);
	}

	.sep {
		margin: 2px 14px;
		border: 0;
		border-top: 1px solid var(--line);
	}

	.quiet {
		display: grid;
		border-radius: var(--radius);
		background: var(--surface);
		overflow: hidden;
	}

	.quiet a {
		--gap: 10px;
		padding: 14px 18px;
	}

	.quiet a + a {
		border-top: 1px solid var(--line);
	}

	.quiet a :global(.chevron) {
		margin-left: auto;
		color: var(--muted);
	}

	.quiet a:hover {
		background: var(--surface-2);
	}
</style>
