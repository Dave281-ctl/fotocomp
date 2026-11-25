<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleCheck } from '@lucide/svelte';
	import SubHeader from '#lib/components/SubHeader.svelte';
	import Uploader from '#lib/components/Uploader.svelte';
	import { photoSrc, photoSrcset } from '#lib/media.ts';
	import { DAY_START_HOUR, VOTING_START_HOUR, formatDay, formatTime } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let replacing = $state(false);
	const phase = $derived(data.phase);
	const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
</script>

<svelte:head><title>Foto hochladen · {data.theme.title} · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 32px">
	<SubHeader
		theme={data.theme}
		eyebrow={phase.kind === 'upload' ? formatDay(phase.day) : undefined}
		title="Foto hochladen"
	/>

	{#if phase.kind !== 'upload'}
		<p class="notice">
			{#if phase.kind === 'voting'}
				Der Upload für heute ist vorbei – jetzt wird bewertet.
				<a href="/themen/{data.theme.id}/bewerten"><u>Zur Bewertung</u></a>
			{:else if phase.kind === 'weekly'}
				Heute ist Wochenbewertung, es gibt keinen Tages-Upload.
				<a href="/themen/{data.theme.id}/wochenfoto"><u>Wochenfoto wählen</u></a>
			{:else if phase.kind === 'upcoming'}
				Das Thema startet am {formatDay(data.theme.startDate)} um {pad(DAY_START_HOUR)} Uhr.
			{:else}
				Dieses Thema ist beendet.
			{/if}
		</p>
	{:else}
		<!-- Was bis wann passiert -->
		<ol class="timeline">
			<li class="now">
				<strong>
					{phase.early ? 'Jetzt bis morgen' : 'Jetzt bis'}
					{formatTime(phase.endsAt)} Uhr
				</strong>
				<span>
					Foto hochladen. Bis dahin kannst du es ersetzen oder löschen – die anderen sehen es noch
					nicht.
				</span>
			</li>
			<li>
				<strong>{pad(VOTING_START_HOUR)} – {pad(DAY_START_HOUR)} Uhr</strong>
				<span>Alle bewerten die Fotos des Tages mit 1–5 Sternen, ohne Namen.</span>
			</li>
			<li>
				<strong>{pad(DAY_START_HOUR)} Uhr</strong>
				<span>Resultat und Namen werden enthüllt.</span>
			</li>
		</ol>

		{#if phase.early}
			<p class="notice">
				Heute hat niemand ein Foto hochgeladen – darum kannst du schon dein Foto für morgen
				hochladen.
			</p>
		{/if}

		{#if data.myPhoto && !replacing}
			<section class="stack" style="--gap: 14px">
				<p class="done row"><CircleCheck size={18} /> Dein Foto ist hochgeladen.</p>
				<figure class="mine">
					<img
						src={photoSrc(data.myPhoto.id)}
						srcset={photoSrcset(data.myPhoto.id)}
						sizes="(max-width: 720px) 100vw, 720px"
						alt="Dein Foto des Tages"
					/>
				</figure>
				<div class="row" style="--gap: 6px">
					<button class="btn" onclick={() => (replacing = true)}>Ersetzen</button>
					<form
						method="POST"
						action="?/deletePhoto"
						use:enhance={({ cancel }) => {
							if (!confirm('Foto wirklich löschen?')) cancel();
						}}
					>
						<button class="btn danger">Löschen</button>
					</form>
				</div>
			</section>
		{:else}
			<Uploader
				themeId={data.theme.id}
				feedbackDefault={data.feedbackDefault}
				maxMb={data.maxUploadMb}
				replacing={!!data.myPhoto}
				error={form?.uploadError}
			/>
			{#if replacing}
				<div>
					<button class="btn ghost small" onclick={() => (replacing = false)}>Abbrechen</button>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.timeline {
		display: grid;
		gap: 14px;
		margin: 0;
		padding: 0 0 0 18px;
		list-style: none;
		border-left: 2px solid var(--line);
	}

	.timeline li {
		position: relative;
		display: grid;
		gap: 2px;
		font-size: 14px;
	}

	.timeline li::before {
		content: '';
		position: absolute;
		left: -24px;
		top: 5px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--line);
	}

	.timeline li.now::before {
		background: var(--accent);
	}

	.timeline span {
		color: var(--muted);
	}

	.done {
		--gap: 8px;
		margin: 0;
		color: var(--ok);
		font-weight: 500;
	}

	figure {
		margin: 0;
		background: var(--photo-bg);
		border-radius: var(--radius);
		overflow: hidden;
	}

	figure img {
		width: 100%;
		max-height: 70vh;
		object-fit: contain;
	}
</style>
