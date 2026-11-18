<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Einstellungen · Admin · Fotocomp</title></svelte:head>

<form
	method="POST"
	class="stack"
	style="--gap: 28px; max-width: 560px"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
>
	<fieldset class="stack" style="--gap: 10px">
		<legend>Registrierung</legend>
		<label class="check">
			<input
				type="radio"
				name="registration"
				value="open"
				checked={data.settings.registration === 'open'}
			/>
			Offen – jeder mit dem Link kann sich registrieren
		</label>
		<label class="check">
			<input
				type="radio"
				name="registration"
				value="invite"
				checked={data.settings.registration === 'invite'}
			/>
			Nur mit Einladung
		</label>
	</fieldset>

	<fieldset class="stack" style="--gap: 10px">
		<legend>Themen erstellen dürfen</legend>
		<label class="check">
			<input
				type="radio"
				name="themeCreation"
				value="admins"
				checked={data.settings.themeCreation === 'admins'}
			/>
			Nur Admins
		</label>
		<label class="check">
			<input
				type="radio"
				name="themeCreation"
				value="all"
				checked={data.settings.themeCreation === 'all'}
			/>
			Alle Benutzer
		</label>
	</fieldset>

	<div class="row">
		<button class="btn primary">Speichern</button>
		{#if form?.saved}<span class="muted small">Gespeichert</span>{/if}
	</div>
</form>

<style>
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}

	legend {
		font-weight: 600;
		margin-bottom: 10px;
	}
</style>
