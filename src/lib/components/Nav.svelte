<script lang="ts">
	import { page } from '$app/state';
	import { House, Images, Layers, MessageCircle, Shield, UserRound } from '@lucide/svelte';
	import { live } from '#lib/chat-live.svelte.ts';
	import ThemeToggle from './ThemeToggle.svelte';
	import logoMark from './logo-mark.svg?raw';

	let {
		user,
		theme,
		themesHref = '/themen',
		openTasks = 0
	}: {
		user: { name: string; role: string };
		theme: 'dark' | 'light';
		themesHref?: string;
		/** Offene Aufgaben (Zähler bei «Heute») */
		openTasks?: number;
	} = $props();

	/** Zähler pro Menüpunkt: Heute = offene Aufgaben, Chat = ungelesene Nachrichten */
	const badge = (href: string) => (href === '/' ? openTasks : href === '/chat' ? live.unread : 0);
	const badgeLabel = (href: string, n: number) =>
		href === '/' ? (n === 1 ? 'offene Aufgabe' : 'offene Aufgaben') : 'ungelesen';

	const items = $derived([
		{ href: '/', label: 'Heute', icon: House },
		{ href: themesHref, label: 'Themen', icon: Layers, section: '/themen' },
		{ href: '/chat', label: 'Chat', icon: MessageCircle },
		{ href: '/galerie', label: 'Galerie', icon: Images },
		{ href: '/profil', label: 'Profil', icon: UserRound },
		// Auf dem Handy liegt «Admin» im Profil (sonst wird die Leiste zu eng)
		...(user.role === 'admin'
			? [{ href: '/admin', label: 'Admin', icon: Shield, desktopOnly: true }]
			: [])
	]);

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	const activeItem = (item: { href: string; section?: string }) =>
		isActive(item.section ?? item.href);
</script>

<header>
	<a class="brand" href="/">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes, statisches Logo -->
		<span class="mark" aria-hidden="true">{@html logoMark}</span>
		Fotocomp
	</a>
	<nav>
		{#each items as item (item.href)}
			<a
				href={item.href}
				class:active={activeItem(item)}
				class:desktop-only={'desktopOnly' in item}
			>
				<span class="icon">
					<item.icon size={20} strokeWidth={1.6} />
					{#if badge(item.href)}
						<span
							class="count"
							aria-label="{badge(item.href)} {badgeLabel(item.href, badge(item.href))}"
						>
							{badge(item.href) > 99 ? '99+' : badge(item.href)}
						</span>
					{/if}
				</span>
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
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.mark {
		display: grid;
		width: 22px;
		height: 22px;
		color: var(--text);
	}

	.mark :global(svg) {
		width: 100%;
		height: 100%;
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
	.icon {
		position: relative;
		display: grid;
	}

	.count {
		position: absolute;
		top: -6px;
		right: -10px;
		min-width: 17px;
		height: 17px;
		padding: 0 4px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-text);
		font-size: 10px;
		font-weight: 700;
		line-height: 17px;
		text-align: center;
	}

	@media (max-width: 720px) {
		.desktop-only {
			display: none !important;
		}

		/* backdrop-filter würde die fixierte Leiste unten an den Header binden */
		header {
			justify-content: space-between;
			position: static;
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background: var(--bg);
		}

		nav {
			position: fixed;
			z-index: 30;
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
