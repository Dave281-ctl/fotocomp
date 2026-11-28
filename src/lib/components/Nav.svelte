<script lang="ts">
	import { page } from '$app/state';
	import { House, Images, Layers, MessageCircle, Shield, UserRound } from '@lucide/svelte';
	import { live } from '#lib/chat-live.svelte.ts';

	let {
		user,
		themesHref = '/themen',
		openTasks = 0
	}: {
		user: { name: string; role: string };
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
		{ href: '/galerie', label: 'Galerie', icon: Images },
		{ href: '/chat', label: 'Chat', icon: MessageCircle },
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

	/**
	 * Seiten mit grossem Titelbild steuern die Kopfzeile am Handy über `header`:
	 * «overlay» = liegt auf dem Bild (Heute), «hidden» = eigene Kopfzeile (Thema).
	 */
	const overlay = $derived(page.data.header === 'overlay');
	const hidden = $derived(page.data.header === 'hidden');
</script>

<header class:overlay class:hidden>
	<a class="brand" href="/" aria-label="Fotocomp, zu Heute">fotocomp<span class="dot">.</span></a>
	<nav>
		{#each items as item (item.href)}
			<a
				href={item.href}
				class:active={activeItem(item)}
				aria-current={activeItem(item) ? 'page' : undefined}
				class:desktop-only={'desktopOnly' in item}
			>
				<span class="icon">
					<item.icon size={22} strokeWidth={activeItem(item) ? 2.2 : 1.8} />
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

	/* Logo «fotocomp.» mit Punkt in der Akzentfarbe */
	.brand {
		margin-right: auto;
		font-family: var(--font-logo);
		font-size: 17px;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.dot {
		color: var(--accent);
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
		font-weight: 600;
		transition: color 0.15s;
	}

	nav a:hover,
	nav a.active {
		color: var(--text);
	}

	nav a.active {
		background: var(--surface);
		font-weight: 700;
	}

	nav a :global(svg) {
		display: none;
	}

	.icon {
		position: relative;
		display: grid;
	}

	.count {
		position: absolute;
		top: -4px;
		right: -10px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-text);
		font-size: 10px;
		font-weight: 800;
		line-height: 16px;
		text-align: center;
	}

	/* Desktop: Zähler neben dem Text statt über dem Symbol */
	@media (min-width: 721px) {
		.count {
			position: static;
			margin-left: 2px;
		}

		.icon {
			order: 1;
		}
	}

	/* Handy: Navigation als schwebende Insel unten */
	@media (max-width: 720px) {
		.desktop-only {
			display: none !important;
		}

		/* backdrop-filter würde die fixierte Leiste unten an den Header binden */
		header {
			position: static;
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background: var(--bg);
		}

		header.hidden {
			display: none;
		}

		header.overlay {
			position: absolute;
			left: 0;
			right: 0;
			background: none;
			color: #fff;
		}

		nav {
			position: fixed;
			z-index: 30;
			left: 16px;
			right: 16px;
			bottom: var(--tabbar-bottom);
			max-width: 480px;
			margin: 0 auto;
			height: 64px;
			padding: 0 6px;
			display: grid;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			align-items: center;
			gap: 0;
			border-radius: 999px;
			background: var(--tabbar-bg);
			backdrop-filter: blur(20px);
			-webkit-backdrop-filter: blur(20px);
			border: 1px solid var(--tabbar-edge);
			box-shadow: var(--tabbar-shadow);
		}

		nav a {
			flex-direction: column;
			justify-content: center;
			gap: 2px;
			height: 52px;
			padding: 0;
			font-size: 11px;
			font-weight: 600;
		}

		nav a.active {
			background: var(--tabbar-active);
			font-weight: 700;
		}

		nav a :global(svg) {
			display: block;
		}
	}
</style>
