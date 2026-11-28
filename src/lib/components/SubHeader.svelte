<script lang="ts">
	import BackLink from './BackLink.svelte';

	/** Kopf einer Unterseite: zurück zum Thema, darunter der Titel. */
	let {
		theme,
		title,
		eyebrow
	}: { theme: { id: number; title: string }; title: string; eyebrow?: string } = $props();
</script>

<header class="sub">
	<BackLink href="/themen/{theme.id}" label={theme.title} />
	{#if eyebrow}<p class="muted small eyebrow-line">{eyebrow}</p>{/if}
	<h1>{title}</h1>
</header>

<style>
	.sub {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.eyebrow-line {
		margin-top: 8px;
		padding: 0 4px;
	}

	h1 {
		padding: 0 4px;
		font-size: 32px;
		line-height: 1.05;
		letter-spacing: -0.03em;
	}
</style>
