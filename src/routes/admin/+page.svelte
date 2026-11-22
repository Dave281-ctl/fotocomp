<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const v = $derived(data.version);
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

<!-- Installierte und neueste Version; der Link führt zur Versionsübersicht auf GitHub -->
<a class="card version" href={v.releasesUrl} target="_blank" rel="noopener">
	<div class="stack" style="--gap: 4px">
		<span class="muted small">Installiert</span>
		<strong>{v.installed}</strong>
	</div>
	<div class="stack" style="--gap: 4px">
		<span class="muted small">Neueste Version</span>
		<strong>{v.latest ?? 'unbekannt'}</strong>
	</div>
	<div class="status">
		{#if v.updateAvailable}
			<span class="badge accent">Update verfügbar</span>
			<span class="muted small">Watchtower installiert es innert 30 Minuten.</span>
		{:else if v.latest && v.latest === v.installed}
			<span class="badge ok">Aktuell</span>
		{:else}
			<span class="muted small">Alle Versionen auf GitHub</span>
		{/if}
	</div>
	<ExternalLink size={16} class="arrow" />
</a>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 12px;
	}

	.version {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		align-items: center;
		gap: 16px 40px;
		margin-top: 24px;
		transition: background 0.15s;
	}

	.version:hover {
		background: var(--surface-2);
	}

	.status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 12px;
	}

	.version :global(.arrow) {
		color: var(--muted);
	}

	.badge.ok {
		color: var(--ok);
	}

	@media (max-width: 720px) {
		.version {
			grid-template-columns: 1fr 1fr auto;
		}

		.status {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}

	.value {
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
</style>
