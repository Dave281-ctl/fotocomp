<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Registrieren · Fotocomp</title></svelte:head>

{#if form?.sent}
	<AuthCard title="Fast geschafft">
		<p class="muted">
			Wir haben dir eine Mail an <strong>{form.email}</strong> geschickt. Klicke auf den Link oder gib
			den Code ein.
		</p>
		<form method="POST" action="/login?/code" class="stack">
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
			<button class="btn primary block">Bestätigen</button>
		</form>
	</AuthCard>
{:else if !data.allowed}
	<AuthCard title="Nur mit Einladung">
		<p class="muted">
			Fotocomp ist ein privater Kreis. Bitte jemanden, der schon dabei ist, dir eine Einladung zu
			schicken.
		</p>
		<a class="btn block" href="/login">Zur Anmeldung</a>
	</AuthCard>
{:else}
	<AuthCard title="Mitmachen">
		{#if data.inviterName}
			<p class="muted"><strong>{data.inviterName}</strong> lädt dich zu Fotocomp ein.</p>
		{/if}
		<p class="muted">
			Ein Thema, jeden Tag ein Foto. Am Abend wird gegenseitig bewertet, am Morgen gibt es das
			Resultat.
		</p>
		<form
			method="POST"
			class="stack"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update();
					busy = false;
				};
			}}
		>
			<input type="hidden" name="einladung" value={data.inviteToken ?? ''} />
			<label>
				Name
				<input
					type="text"
					name="name"
					value={form?.name ?? ''}
					autocomplete="given-name"
					required
				/>
			</label>
			<label>
				E-Mail
				<input
					type="email"
					name="email"
					value={form?.email ?? data.inviteEmail ?? ''}
					autocomplete="email"
					required
				/>
			</label>
			{#if form?.error}<p class="error">{form.error}</p>{/if}
			<button class="btn primary block" disabled={busy}>Registrieren</button>
		</form>
		<p class="muted small">Schon dabei? <a href="/login"><u>Anmelden</u></a></p>
	</AuthCard>
{/if}
