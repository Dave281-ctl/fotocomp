<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const u = $derived(data.update);
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

{#if data.placeholders.length}
	<div class="notice stack placeholders" style="--gap: 6px">
		<strong>Die .env ist noch nicht fertig ausgefüllt</strong>
		<span>
			Noch mit Platzhalter der Vorlage: <code>{data.placeholders.join(', ')}</code>. Werte in der
			<code>.env</code> auf dem NAS ersetzen und das Projekt neu erstellen.
		</span>
	</div>
{/if}

<!-- Hinweis nur, wenn ein Update wartet; alles Weitere unter Einstellungen → Updates -->
{#if u.updateAvailable}
	<a class="card update row" href="/admin/einstellungen#updates">
		<span class="badge accent">Update</span>
		<span>
			{u.latest} ist verfügbar
			<span class="muted">
				· {u.automatic && u.configured ? 'wird automatisch installiert' : 'jetzt installieren'}
			</span>
		</span>
		<ChevronRight size={18} class="arrow" />
	</a>
{/if}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 12px;
	}

	.placeholders {
		margin-top: 24px;
	}

	.update {
		margin-top: 24px;
		--gap: 12px;
		transition: background 0.15s;
	}

	.update:hover {
		background: var(--surface-2);
	}

	.update :global(.arrow) {
		margin-left: auto;
		color: var(--muted);
	}

	.value {
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
</style>
