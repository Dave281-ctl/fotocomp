<script lang="ts">
	import { ChevronLeft, Search } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let query = $state('');
	const people = $derived(
		data.people.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
	);
</script>

<svelte:head><title>Neuer Chat · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 20px">
	<div class="stack" style="--gap: 8px">
		<a class="back row muted small" href="/chat"><ChevronLeft size={16} /> Chat</a>
		<h1>Neuer Chat</h1>
	</div>
	<div class="search">
		<Search size={16} />
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="search"
			placeholder="Person suchen …"
			bind:value={query}
			aria-label="Person suchen"
			autofocus
		/>
	</div>
	<ul class="people">
		{#each people as p (p.id)}
			<li>
				<a class="row" href="/chat/mit/{p.id}">
					<Avatar name={p.name} id={p.id} size={36} />
					{p.name}
				</a>
			</li>
		{:else}
			<li class="muted">Niemand gefunden.</li>
		{/each}
	</ul>
</div>

<style>
	.back {
		--gap: 2px;
		width: fit-content;
	}

	.search {
		display: flex;
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

	.people {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.people a {
		--gap: 12px;
		padding: 10px 6px;
		border-radius: var(--radius-sm);
	}

	.people a:hover {
		background: var(--surface);
	}
</style>
