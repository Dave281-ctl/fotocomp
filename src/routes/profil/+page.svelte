<script lang="ts">
	import { enhance } from '$app/forms';
	import { LogOut, UserPlus } from '@lucide/svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.profile);
</script>

<svelte:head><title>Profil · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 40px">
	<div class="stack" style="--gap: 6px">
		<p class="eyebrow">Profil</p>
		<h1>{p.name}</h1>
		<p class="muted">{p.email}</p>
	</div>

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
			<label class="check">
				<input type="checkbox" name="emailNotifications" checked={p.emailNotifications} />
				Erinnerungen per Mail (Bewertung, Resultat, Wochenfoto, Feedback-Runde)
			</label>
		</div>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<div class="row">
			<button class="btn primary">Speichern</button>
			{#if form?.saved}<span class="muted small">Gespeichert</span>{/if}
		</div>
	</form>

	<hr class="divider" />

	<div class="stack" style="--gap: 4px">
		<a class="item row" href="/profil/einladen"><UserPlus size={18} /> Freunde einladen</a>
		<div class="item row">
			<span>Darstellung</span>
			<ThemeToggle theme={data.theme} />
		</div>
		<form method="POST" action="/abmelden">
			<button class="item row logout"><LogOut size={18} /> Abmelden</button>
		</form>
	</div>
</div>

<style>
	.item {
		justify-content: flex-start;
		padding: 12px 0;
		font-size: 15px;
		width: 100%;
	}

	.item:has(:global(.btn)) {
		justify-content: space-between;
	}

	.logout {
		background: none;
		border: 0;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
	}
</style>
