<script lang="ts">
	import { onMount } from 'svelte';
	import { Smartphone, X } from '@lucide/svelte';
	import { isStandalone, platform } from '../push-client.ts';

	/**
	 * Einmal pro Gerät auf «Heute»: Fotocomp läuft auf dem Handy noch im Browser –
	 * Hinweis auf die Installation. Danach steht die Anleitung im Profil.
	 */
	const KEY = 'fotocomp-install-hint';
	let show = $state(false);

	onMount(() => {
		if (platform() === 'other' || isStandalone()) return;
		try {
			show = localStorage.getItem(KEY) !== '1';
		} catch {
			show = false; // kein Speicher: lieber nicht jedes Mal zeigen
		}
	});

	function done() {
		show = false;
		try {
			localStorage.setItem(KEY, '1');
		} catch {
			// egal
		}
	}
</script>

{#if show}
	<section class="hint card">
		<span class="icon"><Smartphone size={20} /></span>
		<div class="text">
			<strong>Fotocomp als App installieren</strong>
			<span class="muted">
				Schneller starten und Push-Mitteilungen bekommen – dauert eine Minute.
			</span>
			<div class="row" style="--gap: 8px; margin-top: 6px">
				<a class="btn accent small" href="/profil#installieren" onclick={done}>Zur Anleitung</a>
				<button class="btn ghost small" onclick={done}>Später</button>
			</div>
		</div>
		<button class="close" onclick={done} aria-label="Ausblenden"><X size={16} /></button>
	</section>
{/if}

<style>
	.hint {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 14px;
		padding: 16px 18px;
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
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

	.text {
		display: grid;
		gap: 2px;
		padding-right: 18px;
		font-size: 14px;
	}

	.text strong {
		font-size: 15px;
	}

	.close {
		position: absolute;
		top: 8px;
		right: 8px;
		display: grid;
		padding: 6px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}
</style>
