<script lang="ts">
	import ThemeForm from '#lib/components/ThemeForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Thema bearbeiten · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 32px">
	<div class="stack" style="--gap: 6px">
		<p class="eyebrow">Thema bearbeiten</p>
		<h1>{data.theme.title}</h1>
	</div>
	<ThemeForm values={form?.values ?? data.theme} error={form?.error} submitLabel="Speichern" />
</div>
