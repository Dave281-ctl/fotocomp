<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import SubHeader from '#lib/components/SubHeader.svelte';
	import { formatDay, formatTime, themeSummary, zurichParts } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const theme = $derived(data.theme);
	const when = (d: Date) => `${formatDay(zurichParts(d).date)}, ${formatTime(d)} Uhr`;
</script>

<svelte:head><title>Details · {theme.title} · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 36px">
	<SubHeader {theme} eyebrow="Details & Einstellungen" title={theme.title} />

	<section class="stack" style="--gap: 10px">
		<h2>Ablauf</h2>
		{#if theme.description}<p>{theme.description}</p>{/if}
		<ul class="facts muted">
			{#each themeSummary(theme) as line (line)}<li>{line}</li>{/each}
			<li>Jeden Tag: Upload bis 20:00 Uhr, Bewertung bis 05:00 Uhr, dann das Resultat.</li>
		</ul>
	</section>

	<section class="stack" style="--gap: 12px">
		<h2>Teilnehmende ({data.members.length})</h2>
		{#if data.members.length}
			<ul class="members">
				{#each data.members as m (m.id)}
					<li>
						<a class="row" href="/person/{m.id}">
							<Avatar name={m.name} id={m.id} size={28} />
							{m.name}
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">Noch niemand.</p>
		{/if}
	</section>

	{#if !data.ended}
		<section class="stack" style="--gap: 10px">
			<h2>Feedback-Runde</h2>
			{#if data.round}
				<p class="muted">
					{data.roundActive ? 'Läuft bis' : 'Nächste Runde:'}
					{when(data.roundActive ? data.round.endsAt : data.round.startsAt)}
					{#if data.isMine}· <a href="/themen/{theme.id}/feedback"><u>Zur Runde</u></a>{/if}
				</p>
			{:else}
				<p class="muted">Keine Runde geplant.</p>
			{/if}
			{#if data.canManage}
				<div class="row">
					{#if data.round && data.roundActive}
						<form method="POST" action="?/endRound" use:enhance>
							<input type="hidden" name="roundId" value={data.round.id} />
							<button class="btn small">Runde beenden</button>
						</form>
					{:else}
						<form method="POST" action="?/startRound" class="row" style="--gap: 8px" use:enhance>
							<select name="hours" aria-label="Dauer" style="width: auto">
								<option value="24">24 Stunden</option>
								<option value="48">2 Tage</option>
								<option value="72">3 Tage</option>
								<option value="168">1 Woche</option>
							</select>
							<button class="btn small">Runde jetzt starten</button>
						</form>
					{/if}
				</div>
			{/if}
		</section>
	{/if}

	{#if data.isMine || (data.canManage && !data.ended)}
		<hr class="divider" />
		<div class="row actions">
			{#if data.canManage && !data.ended}
				<a class="btn small" href="/themen/{theme.id}/bearbeiten">Thema bearbeiten</a>
			{/if}
			{#if data.isMine}
				<form
					method="POST"
					action="?/leave"
					use:enhance={({ cancel }) => {
						if (!confirm(`«${theme.title}» wirklich verlassen? Deine Fotos bleiben erhalten.`))
							cancel();
					}}
				>
					<button class="btn ghost small">Thema verlassen</button>
				</form>
			{/if}
			{#if data.canManage && !data.ended}
				<form
					method="POST"
					action="?/end"
					use:enhance={({ cancel }) => {
						if (!confirm('Thema jetzt für alle beenden?')) cancel();
					}}
				>
					<button class="btn danger small">Thema beenden</button>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	p {
		margin: 0;
	}

	.facts {
		display: grid;
		gap: 4px;
		margin: 0;
		padding-left: 18px;
	}

	.members {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.members a {
		--gap: 10px;
		width: fit-content;
	}

	.members a:hover {
		text-decoration: underline;
	}

	.actions {
		--gap: 8px;
		flex-wrap: wrap;
	}
</style>
