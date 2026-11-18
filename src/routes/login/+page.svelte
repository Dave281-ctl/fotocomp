<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let busy = $state(false);

	const submit = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
		};
	};
</script>

<svelte:head><title>Anmelden · Fotocomp</title></svelte:head>

{#if form?.sent}
	<AuthCard title="Schau in dein Postfach">
		<p class="muted">
			Falls <strong>{form.email}</strong> registriert ist, haben wir dir einen Login-Link geschickt. Du
			kannst auch den 6-stelligen Code aus der Mail hier eingeben.
		</p>
		<form method="POST" action="?/code" class="stack" use:enhance={submit}>
			<input type="hidden" name="email" value={form.email} />
			<label>
				Code
				<input
					type="text"
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					maxlength="7"
					placeholder="123456"
					required
				/>
			</label>
			{#if form.error}<p class="error">{form.error}</p>{/if}
			<button class="btn primary block" disabled={busy}>Anmelden</button>
		</form>
		<a class="muted small" href="/login">Andere Adresse verwenden</a>
	</AuthCard>
{:else}
	<AuthCard title="Anmelden">
		<p class="muted">Kein Passwort nötig: Wir schicken dir einen Link per Mail.</p>
		<form method="POST" action="?/send" class="stack" use:enhance={submit}>
			<label>
				E-Mail
				<input type="email" name="email" value={form?.email ?? ''} autocomplete="email" required />
			</label>
			{#if form?.error}<p class="error">{form.error}</p>{/if}
			<button class="btn primary block" disabled={busy}>Login-Link senden</button>
		</form>
		<p class="muted small">Noch kein Konto? <a href="/registrieren"><u>Registrieren</u></a></p>
	</AuthCard>
{/if}
