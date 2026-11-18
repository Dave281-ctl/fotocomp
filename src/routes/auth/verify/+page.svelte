<script lang="ts">
	import { page } from '$app/state';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Anmelden · Fotocomp</title></svelte:head>

{#if form?.error}
	<AuthCard title="Link abgelaufen">
		<p class="muted">Dieser Link ist abgelaufen oder wurde schon benutzt.</p>
		<a class="btn primary block" href="/login">Neuen Link anfordern</a>
	</AuthCard>
{:else}
	<AuthCard title="Willkommen">
		<form method="POST" class="stack">
			<input type="hidden" name="token" value={page.url.searchParams.get('token') ?? ''} />
			<button class="btn primary block">Jetzt anmelden</button>
		</form>
		<p class="muted small">Du bleibst auf diesem Gerät angemeldet.</p>
	</AuthCard>
{/if}
