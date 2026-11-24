<script lang="ts">
	import { onMount } from 'svelte';
	import { EllipsisVertical, Share, SquarePlus } from '@lucide/svelte';
	import { install, promptInstall } from '../install-prompt.svelte.ts';
	import { platform, type Platform } from '../push-client.ts';

	/** Anleitung: Fotocomp auf dem Home-Bildschirm installieren, passend zum Gerät. */
	let { only }: { only?: Platform } = $props();

	let detected = $state<Platform>('other');
	onMount(() => (detected = platform()));
	const show = $derived(only ?? detected);
</script>

{#if install.installed}
	<p class="muted">Installiert! Öffne Fotocomp jetzt über das Symbol auf deinem Startbildschirm.</p>
{:else if show === 'ios'}
	<ol class="steps">
		<li>
			Tippe in Safari auf <strong>Teilen</strong>
			<span class="ico"><Share size={16} /></span> – unten in der Mitte, in Chrome oben rechts.
		</li>
		<li>
			Wähle <strong>Zum Home-Bildschirm</strong>
			<span class="ico"><SquarePlus size={16} /></span>. Eventuell etwas nach unten scrollen.
		</li>
		<li>Tippe auf <strong>Hinzufügen</strong>.</li>
		<li>Öffne Fotocomp ab jetzt über das neue Symbol – dort kannst du Mitteilungen erlauben.</li>
	</ol>
	<p class="muted small">Mitteilungen gibt es ab iOS 16.4.</p>
{:else if show === 'android'}
	{#if install.event}
		<button class="btn accent" onclick={promptInstall}>Fotocomp installieren</button>
	{:else}
		<ol class="steps">
			<li>
				Tippe in Chrome oben rechts auf <strong>Menü</strong>
				<span class="ico"><EllipsisVertical size={16} /></span>.
			</li>
			<li>
				Wähle <strong>App installieren</strong> oder
				<strong>Zum Startbildschirm hinzufügen</strong>.
			</li>
			<li>Bestätige mit <strong>Installieren</strong>.</li>
			<li>Öffne Fotocomp ab jetzt über das neue Symbol auf dem Startbildschirm.</li>
		</ol>
	{/if}
{:else}
	<p class="muted">
		Öffne Fotocomp auf deinem Handy im Browser und füge es zum Home-Bildschirm hinzu: auf dem iPhone
		über <strong>Teilen → Zum Home-Bildschirm</strong>, auf Android über
		<strong>Menü → App installieren</strong>.
	</p>
{/if}

<style>
	.steps {
		display: grid;
		gap: 10px;
		margin: 0;
		padding-left: 22px;
		line-height: 1.5;
	}

	.ico {
		display: inline-grid;
		place-items: center;
		width: 26px;
		height: 26px;
		margin: 0 2px;
		vertical-align: middle;
		border-radius: 7px;
		background: var(--surface-2);
		color: var(--accent);
	}
</style>
