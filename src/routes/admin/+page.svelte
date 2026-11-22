<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const releaseUrl = $derived(
		data.version.startsWith('v')
			? `https://github.com/Dave281-ctl/fotocomp/releases/tag/${data.version}`
			: 'https://github.com/Dave281-ctl/fotocomp/releases'
	);
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

<p class="muted small version">
	Fotocomp {data.version} ·
	<a href={releaseUrl} target="_blank" rel="noopener">Release-Notes</a>
</p>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 12px;
	}

	.version {
		margin-top: 32px;
	}

	.version a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.value {
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
</style>
