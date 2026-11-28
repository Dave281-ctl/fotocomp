<script lang="ts">
	import { Plus, Search } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { photoSrc } from '#lib/media.ts';
	import { formatShortDay } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Theme = (typeof data.open)[number];

	const all = $derived([...data.open, ...data.past]);
	const mineOpen = $derived(data.open.filter((t) => t.mine));
	const others = $derived([...data.open.filter((t) => !t.mine), ...data.past]);

	// «Meine» zuerst, ohne eigene Themen gleich «Alle»
	let tab = $state<'mine' | 'all' | null>(null);
	const current = $derived(tab ?? (mineOpen.length ? 'mine' : 'all'));

	let query = $state('');
	/** Sofort beim Tippen filtern: Titel und Beschreibung, ohne Gross-/Kleinschreibung. */
	const matches = (t: Theme) => {
		const q = query.trim().toLowerCase();
		return !q || `${t.title} ${t.description ?? ''}`.toLowerCase().includes(q);
	};
	const filtered = $derived(all.filter(matches));

	const status = (t: Theme) =>
		t.phase === 'upcoming'
			? `startet ${formatShortDay(t.startDate)}`
			: t.phase === 'ended'
				? 'beendet'
				: t.endDate
					? `läuft bis ${formatShortDay(t.endDate)}`
					: 'wiederkehrend';
</script>

<svelte:head><title>Themen · Fotocomp</title></svelte:head>

<div class="page narrow themen">
	<h1>Themen</h1>

	<div class="segmented" role="tablist" aria-label="Themen anzeigen">
		<button
			role="tab"
			aria-selected={current === 'mine'}
			onclick={() => (tab = 'mine')}
			type="button"
		>
			Meine · {mineOpen.length}
		</button>
		<button
			role="tab"
			aria-selected={current === 'all'}
			onclick={() => (tab = 'all')}
			type="button"
		>
			Alle · {all.length}
		</button>
	</div>

	{#snippet row(t: Theme)}
		<li class:ended={t.phase === 'ended'}>
			<a class="row-link" href="/themen/{t.id}">
				{#if t.cover}
					<img class="mini" src={photoSrc(t.cover, 480)} alt="" loading="lazy" />
				{:else}
					<span class="mini" aria-hidden="true"></span>
				{/if}
				<span class="row-text">
					<span class="row-title">{t.title}</span>
					<span class="muted small">
						{t.members} dabei · {status(t)}
					</span>
				</span>
			</a>
			{#if t.mine}
				<span class="muted small">dabei</span>
			{:else if t.phase === 'ended'}
				<a class="soft" href="/themen/{t.id}">Ansehen</a>
			{:else}
				<a class="outline" href="/themen/{t.id}/details">Mitmachen</a>
			{/if}
		</li>
	{/snippet}

	{#if current === 'mine'}
		{#each mineOpen as t (t.id)}
			<a class="card-big" href="/themen/{t.id}">
				<span class="cover" class:nocover={!t.cover}>
					{#if t.cover}
						<img src={photoSrc(t.cover, 1200)} alt="" loading="lazy" />
					{/if}
					<span class="shade" aria-hidden="true"></span>
					{#if t.missing}<span class="badge-missing">Dein Foto fehlt</span>{/if}
					<span class="cover-title">{t.title}</span>
				</span>
				<span class="card-body">
					{#if t.description}<span class="desc">{t.description}</span>{/if}
					<span class="card-foot">
						<span class="faces" aria-label="{t.members} dabei">
							{#each t.faces as person (person.id)}
								<Avatar name={person.name} id={person.id} size={26} />
							{/each}
							{#if t.members - 1 > t.faces.length}
								<span class="more">+{t.members - 1 - t.faces.length}</span>
							{/if}
						</span>
						<span class="muted small">{status(t)}</span>
					</span>
				</span>
			</a>
		{/each}

		{#if others.length}
			<h2 class="section">Weitere Themen</h2>
			<ul class="tile list">
				{#each others as t (t.id)}{@render row(t)}{/each}
			</ul>
		{/if}
	{:else}
		<label class="search">
			<Search size={18} />
			<input
				type="search"
				placeholder="Thema suchen"
				bind:value={query}
				aria-label="Thema suchen"
			/>
		</label>
		{#if filtered.length}
			<ul class="tile list">
				{#each filtered as t (t.id)}{@render row(t)}{/each}
			</ul>
		{:else if query}
			<p class="muted">Kein Thema passt zu «{query}».</p>
		{:else}
			<p class="muted">Noch keine Themen.</p>
		{/if}
	{/if}

	{#if data.canCreate}
		<a class="new" href="/themen/neu"><Plus size={18} /> Neues Thema</a>
	{/if}
</div>

<style>
	.themen {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	h1 {
		padding: 0 4px;
		font-size: 32px;
		line-height: 1.05;
		letter-spacing: -0.03em;
	}

	.segmented {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		padding: 4px;
		border-radius: var(--radius-sm);
		background: var(--surface);
	}

	.segmented button {
		padding: 9px 0;
		border: 0;
		border-radius: 9px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}

	.segmented button[aria-selected='true'] {
		background: var(--tabbar-active);
		color: var(--text);
	}

	:global([data-theme='light']) .segmented button[aria-selected='true'] {
		background: var(--bg);
	}

	/* Grosse Karte für eigene Themen */
	.card-big {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: var(--radius);
		background: var(--surface);
	}

	.cover {
		position: relative;
		display: block;
		height: 180px;
		background: var(--surface-2);
	}

	.cover.nocover {
		height: 96px;
	}

	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, transparent 40%, var(--surface) 100%);
	}

	.badge-missing {
		position: absolute;
		top: 12px;
		left: 12px;
		padding: 5px 10px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-text);
		font-size: 12px;
		font-weight: 800;
	}

	.cover-title {
		position: absolute;
		left: 14px;
		right: 14px;
		bottom: 8px;
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 14px 14px;
	}

	.desc {
		font-size: 14px;
		line-height: 1.45;
		color: color-mix(in srgb, var(--text) 75%, var(--muted));
	}

	.card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.faces {
		display: flex;
		align-items: center;
		padding-left: 8px;
	}

	.faces > :global(*) {
		margin-left: -8px;
		box-shadow: 0 0 0 2px var(--surface);
	}

	.more {
		display: grid;
		place-items: center;
		min-width: 26px;
		height: 26px;
		padding: 0 6px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 11px;
		font-weight: 700;
	}

	.section {
		padding: 12px 4px 0;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	/* Liste */
	.tile {
		border-radius: var(--radius);
		background: var(--surface);
	}

	.list {
		margin: 0;
		padding: 0 14px;
		list-style: none;
	}

	.list li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
	}

	.list li + li {
		border-top: 1px solid var(--line);
	}

	.row-link {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
	}

	.mini {
		width: 52px;
		height: 52px;
		flex: none;
		border-radius: var(--radius-sm);
		object-fit: cover;
		background: var(--surface-2);
	}

	.row-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.row-title {
		font-size: 16px;
		font-weight: 700;
	}

	.ended .row-title {
		color: var(--muted);
	}

	.ended .mini {
		opacity: 0.55;
	}

	.outline {
		flex: none;
		padding: 9px 14px;
		border-radius: var(--radius-sm);
		border: 1.5px solid var(--edge);
		font-size: 14px;
		font-weight: 700;
	}

	.soft {
		flex: none;
		padding: 9px 14px;
		font-size: 14px;
		font-weight: 700;
		color: var(--muted);
	}

	.search {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 8px;
		height: 44px;
		padding: 0 12px;
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--muted);
	}

	.search input {
		flex: 1;
		min-width: 0;
		padding: 0;
		border: 0;
		background: none;
		outline: none;
		color: var(--text);
	}

	.new {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 4px;
		padding: 14px;
		border-radius: 14px;
		border: 1.5px dashed var(--edge);
		font-size: 15px;
		font-weight: 700;
	}
</style>
