<script lang="ts">
	import '@fontsource-variable/inter';
	import '../app.css';
	import Nav from '#lib/components/Nav.svelte';
	import PullToRefresh from '#lib/components/PullToRefresh.svelte';
	import PushPrompt from '#lib/components/PushPrompt.svelte';
	import { onMount } from 'svelte';
	import { startLive } from '#lib/chat-live.svelte.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Echtzeit für den Chat und den Zähler im Menü
	onMount(() => {
		if (data.user) startLive(data.chatUnread);
	});
</script>

<svelte:head>
	<title>Fotocomp</title>
</svelte:head>

{#if data.user}
	<Nav user={data.user} theme={data.theme} themesHref={data.themesHref} />
	<PullToRefresh />
	{#if data.pushKey}<PushPrompt pushKey={data.pushKey} />{/if}
{/if}

<main class:with-nav={data.user}>
	{@render children()}
	<!-- Dezent: die Version, ein Klick führt zum Projekt auf GitHub -->
	<footer class="version">
		<a href={data.repoUrl} target="_blank" rel="noopener">Fotocomp {data.version}</a>
	</footer>
</main>

<style>
	.version {
		padding: 48px 0 20px;
		text-align: center;
		font-size: 11px;
		letter-spacing: 0.04em;
	}

	.version a {
		color: var(--muted);
		opacity: 0.6;
		text-decoration: none;
	}

	.version a:hover {
		opacity: 1;
	}

	@media (max-width: 720px) {
		main.with-nav {
			padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
		}
	}
</style>
