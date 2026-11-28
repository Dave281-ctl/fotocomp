<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import {
		Award,
		Bell,
		ChevronRight,
		CircleHelp,
		LifeBuoy,
		Settings2,
		Shield,
		Smartphone,
		SunMoon,
		UserPlus
	} from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import InstallGuide from '#lib/components/InstallGuide.svelte';
	import { retentionLabel } from '#lib/chat-rules.ts';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { photoSrc } from '#lib/media.ts';
	import { isStandalone, platform } from '#lib/push-client.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.profile);

	// Auf dem Handy im Browser: Hinweis, Fotocomp als App zu installieren
	let canInstall = $state(false);
	let showInstall = $state(false);
	onMount(() => {
		canInstall = platform() !== 'other' && !isStandalone();
		// Link «Zur Anleitung» (/profil#installieren): Anleitung gleich öffnen
		if (location.hash === '#installieren') canInstall = showInstall = true;
	});

	const since = $derived(
		new Intl.DateTimeFormat('de-CH', { month: 'short', year: 'numeric' }).format(
			new Date(data.since)
		)
	);
	const maxCamera = $derived(Math.max(1, ...data.cameras.map((c) => c.photos)));
</script>

<svelte:head><title>Profil · Fotocomp</title></svelte:head>

<div class="page narrow profil">
	<!-- Kopf: Bild, Name, seit wann dabei -->
	<section class="me">
		<Avatar name={p.name} id={p.id} size={72} />
		<span class="me-text">
			<h1>{p.name}</h1>
			<span class="muted small">dabei seit {since}{data.isAdmin ? ' · Admin' : ''}</span>
			<a class="link" href="/person/{p.id}">Meine Seite ansehen ›</a>
		</span>
	</section>

	<!-- Bilanz und Kameras -->
	<section class="tile stats-tile">
		<div class="stats">
			<span><span class="muted">Fotos</span><strong>{data.stats.photos}</strong></span>
			<span><span class="muted">Tagessiege</span><strong>{data.stats.dayWins}</strong></span>
			<span><span class="muted">Wochenfotos</span><strong>{data.stats.weekWins}</strong></span>
		</div>
		{#if data.cameras.length}
			<div class="cameras">
				<span class="muted small">Meine Kameras</span>
				{#each data.cameras as camera (camera.name)}
					<span class="camera">
						<span class="camera-name">{camera.name}</span>
						<span class="track">
							<span class="bar" style="width: {(camera.photos / maxCamera) * 100}%"></span>
						</span>
						<span class="muted">{camera.photos}</span>
					</span>
				{/each}
			</div>
		{/if}
	</section>

	{#if data.highlights.length}
		<p class="section">
			<span>Meine Highlights</span>
			<a class="link" href="/person/{p.id}">Alle ›</a>
		</p>
		<div class="highlights">
			{#each data.highlights as h (h.id)}
				<a href="/foto/{h.id}" aria-label={h.badge === 'week' ? 'Wochenfoto' : 'Highlight'}>
					<img src={photoSrc(h.id, 480)} alt="" loading="lazy" />
					{#if h.badge}<span class="award"><Award size={14} /></span>{/if}
				</a>
			{/each}
		</div>
	{/if}

	<p class="section"><span>Einstellungen</span></p>
	<!-- Einstellungen als Liste: jede Zeile ist als Ganzes klickbar -->
	<div class="tile list">
		<a class="item" href="/profil/mitteilungen">
			<Bell size={20} />
			<span>Mitteilungen</span>
			<span class="muted small">Push und Mail</span>
			<ChevronRight size={18} class="chevron" />
		</a>
		<a class="item" href="/profil/einladen">
			<UserPlus size={20} />
			<span>Freunde einladen</span>
			<span></span>
			<ChevronRight size={18} class="chevron" />
		</a>
		<div class="item static">
			<SunMoon size={20} />
			<span>Erscheinungsbild</span>
			<span></span>
			<ThemeToggle theme={data.theme} />
		</div>
		<details class="more">
			<summary class="item">
				<Settings2 size={20} />
				<span>Profil und Privatsphäre</span>
				<span class="muted small">Name, GPS, Chat</span>
				<ChevronRight size={18} class="chevron" />
			</summary>
			<form
				method="POST"
				class="edit"
				use:enhance={() =>
					async ({ update }) =>
						update({ reset: false })}
			>
				<label>
					Name
					<input type="text" name="name" value={p.name} required />
				</label>
				<p class="muted small">{p.email}</p>
				<label class="check">
					<input type="checkbox" name="feedbackDefault" checked={p.feedbackDefault} />
					Feedback zu meinen Fotos ist standardmässig willkommen
				</label>
				<label class="check">
					<input type="checkbox" name="showGps" checked={p.showGps} />
					Aufnahmeort (GPS) meiner Fotos anderen zeigen
				</label>
				<label>
					Meine Chatnachrichten löschen nach
					<select name="chatRetentionDays" style="width: auto">
						{#each data.chat.options as d (d)}
							<option value={d} selected={data.chat.ownDays === d}>{retentionLabel(d)}</option>
						{/each}
					</select>
					<span class="muted small">
						Höchstens {retentionLabel(data.chat.options.at(-1) ?? 14)} (Vorgabe der Admins). Kürzer gilt
						auch für deine bisherigen Nachrichten.
					</span>
				</label>
				{#if form?.error}<p class="error">{form.error}</p>{/if}
				<div class="row">
					<button class="btn accent">Speichern</button>
					{#if form?.saved}<span class="muted small">Gespeichert</span>{/if}
				</div>
			</form>
		</details>
		{#if canInstall}
			<button class="item" onclick={() => (showInstall = !showInstall)} aria-expanded={showInstall}>
				<Smartphone size={20} />
				<span>Als App installieren</span>
				<span></span>
				<ChevronRight size={18} class="chevron" />
			</button>
			{#if showInstall}
				<div id="installieren" class="install">
					<p class="muted small">
						Mit Fotocomp auf dem Home-Bildschirm startest du schneller, siehst die Fotos ohne
						Browserleiste und bekommst Push-Mitteilungen.
					</p>
					<InstallGuide />
				</div>
			{/if}
		{/if}
	</div>

	<div class="tile list">
		<a class="item" href="/willkommen">
			<CircleHelp size={20} />
			<span>So funktioniert Fotocomp</span>
			<span></span>
			<ChevronRight size={18} class="chevron" />
		</a>
		<a class="item" href="/chat/hilfe">
			<LifeBuoy size={20} />
			<span>Hilfe und Fragen</span>
			<span class="muted small">Admins fragen</span>
			<ChevronRight size={18} class="chevron" />
		</a>
		{#if data.isAdmin}
			<a class="item" href="/admin">
				<Shield size={20} />
				<span>Admin</span>
				<span class="muted small">Benutzer, Themen, Updates</span>
				<ChevronRight size={18} class="chevron" />
			</a>
		{/if}
	</div>

	<form method="POST" action="/abmelden">
		<button class="logout">Abmelden</button>
	</form>
</div>

<style>
	.profil {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.me {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 4px;
	}

	.me-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.me h1 {
		font-size: 32px;
		line-height: 1.05;
		letter-spacing: -0.03em;
	}

	.link {
		font-size: 14px;
		font-weight: 700;
		color: var(--accent);
	}

	.tile {
		border-radius: var(--radius);
		background: var(--surface);
	}

	.stats-tile {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 14px;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.stats > span {
		display: flex;
		flex-direction: column;
		font-size: 13px;
	}

	.stats > span + span {
		border-left: 1px solid var(--line);
		padding-left: 12px;
	}

	.stats strong {
		font-size: 26px;
		font-weight: 700;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}

	.cameras {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}

	.camera {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) 1fr 28px;
		align-items: center;
		gap: 10px;
		font-size: 14px;
	}

	.camera-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.camera .muted {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.track {
		height: 6px;
		border-radius: 3px;
		background: var(--surface-2);
		overflow: hidden;
	}

	.bar {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--accent);
	}

	.section {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 12px 4px 0;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.highlights {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
	}

	.highlights a {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--surface);
	}

	.highlights img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.award {
		position: absolute;
		top: 6px;
		left: 6px;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-text);
	}

	/* Liste */
	.list {
		padding: 0 14px;
	}

	.list > * + * {
		border-top: 1px solid var(--line);
	}

	.item {
		display: grid;
		grid-template-columns: 22px auto 1fr auto;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 52px;
		padding: 12px 0;
		border: 0;
		background: none;
		color: var(--text);
		font: inherit;
		font-size: 16px;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}

	.item > :global(svg:first-child) {
		color: var(--muted);
	}

	.item .muted {
		justify-self: end;
		font-weight: 400;
	}

	.item.static {
		cursor: default;
	}

	.item :global(.chevron) {
		color: var(--muted);
	}

	summary.item {
		list-style: none;
	}

	summary.item::-webkit-details-marker {
		display: none;
	}

	details[open] summary :global(.chevron) {
		transform: rotate(90deg);
	}

	.edit {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 4px 0 16px;
	}

	.install {
		display: grid;
		gap: 12px;
		padding: 4px 0 16px;
	}

	.logout {
		width: 100%;
		margin-top: 4px;
		padding: 14px;
		border: 0;
		border-radius: 14px;
		background: none;
		color: var(--danger);
		font: inherit;
		font-size: 16px;
		font-weight: 700;
		cursor: pointer;
	}
</style>
