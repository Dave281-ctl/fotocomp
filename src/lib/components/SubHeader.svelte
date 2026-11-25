<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';

	/** Kopf einer Unterseite: zurück zum Thema, darunter der Titel. */
	let {
		theme,
		title,
		eyebrow
	}: { theme: { id: number; title: string }; title: string; eyebrow?: string } = $props();
</script>

<header class="stack" style="--gap: 8px">
	<a class="back row muted small" href="/themen/{theme.id}">
		<ChevronLeft size={16} />
		{theme.title}
	</a>
	{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
	<h1>{title}</h1>
</header>

<style>
	.back {
		--gap: 2px;
		width: fit-content;
		margin-left: -4px;
	}

	.back:hover {
		color: var(--text);
	}
</style>
