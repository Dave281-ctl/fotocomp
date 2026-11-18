<script lang="ts">
	import ThemeForm from '#lib/components/ThemeForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(
		form?.values ?? {
			title: '',
			description: '',
			startDate: data.today,
			endDate: null,
			weeklyVoteDay: 7,
			feedbackDay: null,
			feedbackTime: null,
			feedbackHours: 24
		}
	);
</script>

<svelte:head><title>Neues Thema · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 32px">
	<div class="stack" style="--gap: 6px">
		<p class="eyebrow">Themen</p>
		<h1>Neues Thema</h1>
	</div>
	<ThemeForm {values} error={form?.error} submitLabel="Thema erstellen" />
</div>
