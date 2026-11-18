<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Admin · Fotocomp</title></svelte:head>

<div class="stats">
	{#each data.stats as stat (stat.label)}
		<div class="card">
			<div class="value">{stat.value}</div>
			<div class="muted small">{stat.label}</div>
		</div>
	{/each}
</div>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 12px;
	}

	.value {
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
</style>
