<script lang="ts">
	import '@fontsource-variable/inter';
	import '../app.css';
	import Nav from '#lib/components/Nav.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Fotocomp</title>
</svelte:head>

{#if data.user}
	<Nav user={data.user} theme={data.theme} />
{/if}

<main class:with-nav={data.user}>
	{@render children()}
</main>

<style>
	@media (max-width: 720px) {
		main.with-nav {
			padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
		}
	}
</style>
