<script lang="ts">
	/** Reiter mit den eigenen Themen: antippen öffnet das Thema. Punkt = noch etwas zu tun. */
	let {
		tabs,
		current = null
	}: {
		tabs: { id: number; title: string; todo: boolean }[];
		current?: number | null;
	} = $props();
</script>

{#if tabs.length}
	<nav class="tabs" aria-label="Deine Themen">
		{#each tabs as tab (tab.id)}
			<a
				href="/themen/{tab.id}"
				class:active={tab.id === current}
				aria-current={tab.id === current ? 'page' : undefined}
			>
				{tab.title}
				{#if tab.todo}<span class="dot" title="Hier ist noch etwas zu tun"></span>{/if}
			</a>
		{/each}
	</nav>
{/if}

<style>
	.tabs {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -4px;
		padding: 0 4px;
	}

	a {
		position: relative;
		flex: none;
		padding: 7px 14px;
		border-radius: 999px;
		font-size: 14px;
		color: var(--muted);
		background: var(--surface);
		transition:
			color 0.15s,
			background 0.15s;
	}

	a:hover {
		color: var(--text);
	}

	a.active {
		color: var(--bg);
		background: var(--text);
	}

	.dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		margin-left: 6px;
		vertical-align: 1px;
		border-radius: 50%;
		background: var(--accent);
	}
</style>
