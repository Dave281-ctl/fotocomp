<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Compass,
		Copy,
		EllipsisVertical,
		ExternalLink,
		Menu,
		Share,
		SquarePlus,
		TriangleAlert
	} from '@lucide/svelte';
	import { install, promptInstall } from '../install-prompt.svelte.ts';
	import { iosBrowser, platform, safariLink, type Platform } from '../push-client.ts';

	/** Anleitung: Fotocomp auf dem Home-Bildschirm installieren, passend zum Gerät. */
	let { only }: { only?: Platform } = $props();

	let detected = $state<Platform>('other');
	// Auf dem iPhone: geht nur in Safari – in anderen Browsern zuerst dorthin
	let browser = $state({ safari: true, name: 'Safari' });
	let here = $state('');
	let copied = $state(false);
	onMount(() => {
		detected = platform();
		if (detected === 'ios') browser = iosBrowser();
		here = `${location.origin}/profil#installieren`;
	});
	const show = $derived(only ?? detected);
	// Den Safari-Hinweis nur, wenn wir wirklich auf einem iPhone in einem anderen Browser sind
	const wrongBrowser = $derived(show === 'ios' && detected === 'ios' && !browser.safari);

	async function copy() {
		await navigator.clipboard?.writeText(here);
		copied = true;
	}
</script>

{#if install.installed}
	<p class="muted">Installiert! Öffne Fotocomp jetzt über das Symbol auf deinem Startbildschirm.</p>
{:else if wrongBrowser}
	<div class="safari stack" style="--gap: 12px">
		<p class="warn">
			<TriangleAlert size={18} />
			<span>
				Du bist in <strong>{browser.name}</strong>. Auf dem iPhone lässt sich Fotocomp nur aus
				<strong>Safari</strong> installieren.
			</span>
		</p>
		<div class="row" style="--gap: 8px; flex-wrap: wrap">
			<a class="btn accent" href={safariLink(here)}><ExternalLink size={16} /> In Safari öffnen</a>
			<button class="btn" onclick={copy}>
				<Copy size={16} />
				{copied ? 'Kopiert ✓' : 'Link kopieren'}
			</button>
		</div>
		<p class="muted small">
			Klappt «In Safari öffnen» nicht: Link kopieren, <strong>Safari</strong>
			<span class="ico"><Compass size={15} /></span> öffnen, oben in die Adresszeile tippen, einfügen
			– dort steht dann die Anleitung.
		</p>
	</div>
{:else if show === 'ios'}
	<ol class="steps">
		<li>
			Öffne Fotocomp in <strong>Safari</strong> <span class="ico"><Compass size={16} /></span> – nicht
			in Chrome, WhatsApp oder einer anderen App.
		</li>
		<li>
			Tippe unten links neben der Adresse auf das Symbol mit den
			<strong>Strichen</strong> <span class="ico"><Menu size={16} /></span>.
		</li>
		<li>Tippe auf <strong>Teilen</strong> <span class="ico"><Share size={16} /></span>.</li>
		<li>
			Scrolle etwas nach unten und tippe auf <strong>Zum Home-Bildschirm</strong>
			<span class="ico"><SquarePlus size={16} /></span>.
		</li>
		<li>Tippe auf <strong>Hinzufügen</strong>.</li>
		<li>Öffne Fotocomp ab jetzt über das neue Symbol auf dem Home-Bildschirm.</li>
	</ol>
	<p class="muted small">
		Ältere iPhones: <strong>Teilen</strong> <span class="ico"><Share size={14} /></span> ist direkt unten
		in der Leiste – dann Schritt 2 überspringen. Mitteilungen gibt es ab iOS 16.4.
	</p>
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
	.safari p {
		margin: 0;
	}

	.warn {
		display: flex;
		gap: 10px;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
		line-height: 1.45;
	}

	.warn :global(svg) {
		flex: none;
		margin-top: 2px;
		color: var(--accent);
	}

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
