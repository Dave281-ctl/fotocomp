<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ href: '/admin', label: 'Übersicht' },
		{ href: '/admin/benutzer', label: 'Benutzer' },
		{ href: '/admin/fotos', label: 'Fotos' },
		{ href: '/admin/themen', label: 'Themen' },
		{ href: '/admin/einstellungen', label: 'Einstellungen' }
	];
</script>

<div class="page stack" style="--gap: 32px">
	<div class="stack" style="--gap: 16px">
		<p class="eyebrow">Admin</p>
		<nav class="tabs">
			{#each tabs as tab (tab.href)}
				<a href={tab.href} class:active={page.url.pathname === tab.href}>{tab.label}</a>
			{/each}
		</nav>
	</div>
	{@render children()}
</div>

<style>
	/* Waagrecht scrollbar auf schmalen Bildschirmen, aber nie senkrecht.
	   Linien als innere Schatten, damit nichts über den Rand ragt. */
	.tabs {
		display: flex;
		gap: 4px;
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: none;
		box-shadow: inset 0 -1px var(--line);
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.tabs a {
		padding: 10px 14px;
		font-size: 14px;
		color: var(--muted);
		white-space: nowrap;
	}

	.tabs a:hover {
		color: var(--text);
	}

	.tabs a.active {
		color: var(--text);
		box-shadow: inset 0 -2px var(--accent);
	}
</style>
