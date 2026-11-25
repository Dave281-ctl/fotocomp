<script lang="ts">
	import { Check, Plus, Search } from '@lucide/svelte';
	import ThemeTabs from '#lib/components/ThemeTabs.svelte';
	import { formatShortDay } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let query = $state('');

	/** Sofort beim Tippen filtern: Titel und Beschreibung, ohne Gross-/Kleinschreibung. */
	const matches = (t: { title: string; description: string | null }) => {
		const q = query.trim().toLowerCase();
		return !q || `${t.title} ${t.description ?? ''}`.toLowerCase().includes(q);
	};
	const open = $derived(data.open.filter(matches));
	const past = $derived(data.past.filter(matches));

	const status = (t: (typeof data.open)[number]) =>
		t.phase === 'upcoming'
			? `startet ${formatShortDay(t.startDate)}`
			: t.phase === 'ended'
				? `beendet${t.endDate ? ` ${formatShortDay(t.endDate)}` : ''}`
				: 'läuft';
</script>

<svelte:head><title>Themen · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 28px">
	<div class="stack" style="--gap: 14px">
		<p class="eyebrow">Themen</p>
		{#if data.tabs.length}
			<ThemeTabs tabs={data.tabs} />
		{:else}
			<h1>Wähle ein Thema</h1>
		{/if}
	</div>

	<div class="row toolbar">
		<label class="search">
			<Search size={16} />
			<input
				type="search"
				placeholder="Thema suchen …"
				bind:value={query}
				aria-label="Thema suchen"
			/>
		</label>
		{#if data.canCreate}
			<a class="btn" href="/themen/neu"><Plus size={16} /> Neues Thema</a>
		{/if}
	</div>

	{#snippet card(t: (typeof data.open)[number])}
		<a class="card theme" class:mine={t.mine} href="/themen/{t.id}">
			<span class="head">
				<strong>{t.title}</strong>
				{#if t.mine}<span class="mine-badge"><Check size={13} /> dabei</span>{/if}
			</span>
			{#if t.description}<span class="desc">{t.description}</span>{/if}
			<span class="meta">
				<span class:running={t.phase !== 'upcoming' && t.phase !== 'ended'}>{status(t)}</span> · {t.members}
				{t.members === 1 ? 'Teilnehmer' : 'Teilnehmende'}
			</span>
		</a>
	{/snippet}

	{#if open.length}
		<div class="list">
			{#each open as t (t.id)}{@render card(t)}{/each}
		</div>
	{:else if query}
		<p class="muted">Kein Thema passt zu «{query}».</p>
	{:else}
		<p class="muted">Im Moment läuft kein Thema.</p>
	{/if}

	{#if past.length}
		<details class="past" open={!!query}>
			<summary class="muted">Beendete Themen ({past.length})</summary>
			<div class="list">
				{#each past as t (t.id)}{@render card(t)}{/each}
			</div>
		</details>
	{/if}
</div>

<style>
	.toolbar {
		--gap: 10px;
	}

	.search {
		flex: 1;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 8px;
		padding: 0 14px;
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
	}

	.search:focus-within {
		box-shadow: 0 0 0 2px var(--accent);
	}

	.search input {
		flex: 1;
		min-width: 0;
		padding: 11px 0;
		border: 0;
		background: none;
		box-shadow: none;
		outline: none;
		color: var(--text);
	}

	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 10px;
	}

	/* Kompakte Karte: Titel, eine Zeile Beschreibung, Status */
	.theme {
		display: grid;
		gap: 4px;
		padding: 14px 16px;
		transition: background 0.15s;
	}

	.theme:hover {
		background: var(--surface-2);
	}

	.theme.mine {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 50%, transparent);
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
	}

	.mine-badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		flex: none;
		font-size: 12px;
		color: var(--accent);
	}

	.desc {
		font-size: 14px;
		color: color-mix(in srgb, var(--text) 75%, var(--muted));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		font-size: 12px;
		color: var(--muted);
	}

	.running {
		color: var(--ok);
	}

	.past summary {
		cursor: pointer;
		margin-bottom: 12px;
		font-size: 14px;
	}
</style>
