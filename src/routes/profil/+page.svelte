<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import {
		Bell,
		ChevronRight,
		CircleHelp,
		LogOut,
		Smartphone,
		SunMoon,
		UserPlus
	} from '@lucide/svelte';
	import InstallGuide from '#lib/components/InstallGuide.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { isStandalone, platform } from '#lib/push-client.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.profile);

	// Auf dem Handy im Browser: Hinweis, Fotocomp als App zu installieren
	let showInstall = $state(false);
	onMount(() => (showInstall = platform() !== 'other' && !isStandalone()));
</script>

<svelte:head><title>Profil · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 40px">
	<div class="stack" style="--gap: 6px">
		<p class="eyebrow">Profil</p>
		<h1>{p.name}</h1>
		<p class="muted">{p.email}</p>
	</div>

	{#if showInstall}
		<section class="card stack install" style="--gap: 14px">
			<div class="row" style="--gap: 10px">
				<Smartphone size={18} />
				<strong>Fotocomp als App installieren</strong>
			</div>
			<p class="muted">
				Mit Fotocomp auf dem Home-Bildschirm startest du schneller, siehst die Fotos ohne
				Browserleiste und bekommst Push-Mitteilungen.
			</p>
			<InstallGuide />
		</section>
	{/if}

	<form
		method="POST"
		class="stack"
		style="--gap: 20px"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
	>
		<label>
			Name
			<input type="text" name="name" value={p.name} required />
		</label>
		<div class="stack" style="--gap: 12px">
			<label class="check">
				<input type="checkbox" name="feedbackDefault" checked={p.feedbackDefault} />
				Feedback zu meinen Fotos ist standardmässig willkommen
			</label>
			<label class="check">
				<input type="checkbox" name="showGps" checked={p.showGps} />
				Aufnahmeort (GPS) meiner Fotos anderen zeigen
			</label>
		</div>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<div class="row">
			<button class="btn primary">Speichern</button>
			{#if form?.saved}<span class="muted small">Gespeichert</span>{/if}
		</div>
	</form>

	<hr class="divider" />

	<!-- Einstellungen als Liste: jede Zeile ist als Ganzes klickbar -->
	<div class="list">
		<a class="item" href="/profil/mitteilungen">
			<Bell size={18} />
			<span>Mitteilungen</span>
			<ChevronRight size={18} class="chevron" />
		</a>
		<a class="item" href="/profil/einladen">
			<UserPlus size={18} />
			<span>Freunde einladen</span>
			<ChevronRight size={18} class="chevron" />
		</a>
		<a class="item" href="/willkommen">
			<CircleHelp size={18} />
			<span>So funktioniert Fotocomp</span>
			<ChevronRight size={18} class="chevron" />
		</a>
		<div class="item static">
			<SunMoon size={18} />
			<span>Darstellung</span>
			<ThemeToggle theme={data.theme} />
		</div>
		<form method="POST" action="/abmelden">
			<button class="item logout">
				<LogOut size={18} />
				<span>Abmelden</span>
				<ChevronRight size={18} class="chevron" />
			</button>
		</form>
	</div>
</div>

<style>
	.install p {
		margin: 0;
	}

	.list {
		border-radius: var(--radius);
		background: var(--surface);
		overflow: hidden;
	}

	.item {
		display: grid;
		grid-template-columns: 22px 1fr auto;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		padding: 8px 16px;
		border: 0;
		background: none;
		color: var(--text);
		font: inherit;
		font-size: 15px;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
	}

	.list > * + * {
		border-top: 1px solid var(--line);
	}

	.item:not(.static):hover {
		background: var(--surface-2);
	}

	.item.static {
		cursor: default;
	}

	.item :global(.chevron) {
		color: var(--muted);
	}

	.logout {
		color: var(--danger);
	}
</style>
