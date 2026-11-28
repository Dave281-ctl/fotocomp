<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { Bell } from '@lucide/svelte';
	import { listenForInstall } from '../install-prompt.svelte.ts';
	import {
		enablePush,
		isStandalone,
		markPrompted,
		platform,
		pushSupported,
		refreshPush,
		wasPrompted
	} from '../push-client.ts';

	/**
	 * Einmal pro Gerät, beim ersten Start als installierte App: Mitteilungen anbieten.
	 * Automatisch geht es nicht – iOS und Android fragen erst nach einem Antippen.
	 */
	let { pushKey }: { pushKey: string } = $props();

	let open = $state(false);
	let message = $state('');

	onMount(() => {
		listenForInstall();
		if (!pushSupported()) return;
		if (Notification.permission === 'granted') {
			// Erlaubnis besteht: Gerät still (neu) anmelden, einmal pro Sitzung
			try {
				if (sessionStorage.getItem('fotocomp-push-ok')) return;
				sessionStorage.setItem('fotocomp-push-ok', '1');
			} catch {
				// egal
			}
			void refreshPush(pushKey).catch(() => {});
			return;
		}
		if (isStandalone() && Notification.permission === 'default' && !wasPrompted()) {
			setTimeout(() => (open = true), 1200);
		}
	});

	async function allow() {
		markPrompted();
		try {
			const result = await enablePush(pushKey);
			if (result === 'granted') {
				message = 'Mitteilungen sind aktiv. Einstellen kannst du sie im Profil.';
				setTimeout(() => (open = false), 3000);
			} else {
				message =
					platform() === 'ios'
						? 'Kein Problem. Später geht es unter iOS-Einstellungen → Mitteilungen → Fotocomp.'
						: 'Kein Problem. Später geht es im Profil unter «Mitteilungen».';
				setTimeout(() => (open = false), 5000);
			}
		} catch {
			message = 'Das hat nicht geklappt. Versuch es im Profil unter «Mitteilungen» nochmals.';
		}
	}

	function later() {
		markPrompted();
		open = false;
	}
</script>

<!-- Nicht über der Einführung; danach erscheint der Hinweis -->
{#if open && !page.url.pathname.startsWith('/willkommen')}
	<div
		class="sheet card"
		role="dialog"
		aria-label="Mitteilungen erlauben"
		transition:fly={{ y: 40 }}
	>
		<div class="icon"><Bell size={22} /></div>
		<div class="stack" style="--gap: 6px">
			<strong>Keine Runde verpassen</strong>
			{#if message}
				<p class="muted">{message}</p>
			{:else}
				<p class="muted">
					Fotocomp erinnert dich ans Hochladen, ans Bewerten und an neue Resultate – nur wenn es
					etwas zu tun gibt.
				</p>
				<div class="row" style="--gap: 8px; margin-top: 8px">
					<button class="btn accent" onclick={allow}>Mitteilungen erlauben</button>
					<button class="btn ghost" onclick={later}>Später</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.sheet {
		position: fixed;
		z-index: 60;
		left: 12px;
		right: 12px;
		bottom: calc(var(--tabbar-space) + 4px);
		max-width: 480px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 14px;
		padding: 18px;
		box-shadow: 0 12px 40px rgb(0 0 0 / 0.35);
		border: 1px solid var(--line);
	}

	@media (min-width: 721px) {
		.sheet {
			bottom: 24px;
		}
	}

	.icon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		color: var(--accent);
	}

	p {
		margin: 0;
		font-size: 14px;
	}
</style>
