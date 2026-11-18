<script lang="ts">
	import { page } from '$app/state';
	import { House, Images, Layers, Shield, UserRound } from '@lucide/svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let { user, theme }: { user: { name: string; role: string }; theme: 'dark' | 'light' } = $props();

	const items = $derived([
		{ href: '/', label: 'Heute', icon: House },
		{ href: '/galerie', label: 'Galerie', icon: Images },
		{ href: '/themen', label: 'Themen', icon: Layers },
		{ href: '/profil', label: 'Profil', icon: UserRound },
		...(user.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: Shield }] : [])
	]);

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<header>
	<a class="brand" href="/">Fotocomp</a>
	<nav>
		{#each items as item (item.href)}
			<a href={item.href} class:active={isActive(item.href)}>
				<item.icon size={20} strokeWidth={1.6} />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
	<div class="theme"><ThemeToggle {theme} /></div>
</header>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 24px;
		height: var(--nav-h);
		padding: 0 var(--gutter);
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.brand {
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 13px;
		margin-right: auto;
	}

	nav {
		display: flex;
		gap: 4px;
	}

	nav a {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: 999px;
		color: var(--muted);
		font-size: 14px;
		transition: color 0.15s;
	}

	nav a:hover,
	nav a.active {
		color: var(--text);
	}

	nav a.active {
		background: var(--surface);
	}

	nav a :global(svg) {
		display: none;
	}

	/* Mobil: Navigation als Leiste unten */
	@media (max-width: 720px) {
		header {
			justify-content: space-between;
		}

		nav {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			justify-content: space-around;
			gap: 0;
			padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
			background: color-mix(in srgb, var(--bg) 90%, transparent);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border-top: 1px solid var(--line);
		}

		nav a {
			flex-direction: column;
			gap: 2px;
			padding: 6px 10px;
			font-size: 11px;
		}

		nav a.active {
			background: none;
		}

		nav a :global(svg) {
			display: block;
		}
	}
</style>
