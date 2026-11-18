<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDay, formatTime, themeSummary, zurichParts } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const theme = $derived(data.theme);
	const when = (d: Date) => `${formatDay(zurichParts(d).date)}, ${formatTime(d)} Uhr`;
</script>

<svelte:head><title>{theme.title} · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 32px">
	<div class="stack" style="--gap: 12px">
		<p class="eyebrow">Thema</p>
		<h1>{theme.title}</h1>
		{#if theme.description}<p class="lead">{theme.description}</p>{/if}
		<p class="muted small">{themeSummary(theme).join(' · ')}</p>
	</div>

	{#if data.phase !== 'ended'}
		<form method="POST" class="row" use:enhance>
			{#if data.isMine}
				<span class="badge accent">Du machst mit</span>
				<button class="btn ghost small" formaction="?/leave">Verlassen</button>
			{:else}
				<button class="btn primary" formaction="?/join">
					{data.hasOtherTheme ? 'Zu diesem Thema wechseln' : 'Mitmachen'}
				</button>
			{/if}
		</form>
	{:else}
		<p class="muted">
			Dieses Thema ist beendet. <a href="/galerie?thema={theme.id}"><u>Zur Galerie</u></a>
		</p>
	{/if}

	<section class="stack" style="--gap: 10px">
		<h2>Teilnehmende</h2>
		{#if data.members.length}
			<p class="muted">{data.members.map((m) => m.name).join(', ')}</p>
		{:else}
			<p class="muted">Noch niemand.</p>
		{/if}
	</section>

	{#if data.phase !== 'ended'}
		<section class="stack" style="--gap: 10px">
			<h2>Feedback-Runde</h2>
			{#if data.round}
				<p class="muted">
					{data.roundActive ? 'Läuft bis' : 'Nächste Runde:'}
					{when(data.roundActive ? data.round.endsAt : data.round.startsAt)}
					· <a href="/feedback"><u>Zur Runde</u></a>
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

	{#if data.canManage && data.phase !== 'ended'}
		<hr class="divider" />
		<div class="row">
			<a class="btn small" href="/themen/{theme.id}/bearbeiten">Bearbeiten</a>
			<form
				method="POST"
				action="?/end"
				use:enhance={({ cancel }) => {
					if (!confirm('Thema jetzt beenden?')) cancel();
				}}
			>
				<button class="btn danger small">Thema beenden</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.lead {
		font-size: 18px;
		line-height: 1.5;
	}
</style>
