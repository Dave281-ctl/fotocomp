<script lang="ts">
	import { themeSummary } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const status = {
		upcoming: 'Geplant',
		ended: 'Beendet',
		upload: 'Läuft',
		voting: 'Läuft',
		weekly: 'Läuft'
	};
</script>

<svelte:head><title>Themen · Admin · Fotocomp</title></svelte:head>

<div><a class="btn" href="/themen/neu">Neues Thema</a></div>

<div class="scroll">
	<table>
		<thead>
			<tr><th>Thema</th><th>Ablauf</th><th>Teilnehmende</th><th>Status</th><th></th></tr>
		</thead>
		<tbody>
			{#each data.themes as theme (theme.id)}
				<tr>
					<td><a href="/themen/{theme.id}">{theme.title}</a></td>
					<td class="muted">{themeSummary(theme).join(' · ')}</td>
					<td>{theme.members}</td>
					<td>
						<span
							class="badge"
							class:accent={theme.phase !== 'ended' && theme.phase !== 'upcoming'}
						>
							{status[theme.phase]}
						</span>
					</td>
					<td>
						{#if theme.phase !== 'ended'}
							<a class="btn ghost small" href="/themen/{theme.id}/bearbeiten">Bearbeiten</a>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroll {
		overflow-x: auto;
	}
</style>
