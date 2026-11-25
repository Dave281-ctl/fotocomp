<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { BellRing, ChevronLeft } from '@lucide/svelte';
	import InstallGuide from '#lib/components/InstallGuide.svelte';
	import { NOTIFY_KINDS } from '#lib/notify.ts';
	import {
		currentSubscription,
		disablePush,
		enablePush,
		isStandalone,
		platform,
		pushSupported,
		testPush,
		type Platform
	} from '#lib/push-client.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Zustand von Push auf diesem Gerät */
	type State = 'loading' | 'unsupported' | 'install' | 'off' | 'denied' | 'on';
	let status = $state<State>('loading');
	let device = $state<Platform>('other');
	let busy = $state(false);
	let note = $state('');

	async function check() {
		device = platform();
		if (!pushSupported()) {
			// iPhone im Browser: Push erst in der installierten App
			status = device === 'ios' && !isStandalone() ? 'install' : 'unsupported';
			return;
		}
		if (Notification.permission === 'denied') status = 'denied';
		else status = (await currentSubscription()) ? 'on' : 'off';
	}
	onMount(check);

	async function turnOn() {
		busy = true;
		note = '';
		try {
			await enablePush(data.pushKey!);
		} catch {
			note = 'Das hat nicht geklappt. Bitte nochmals versuchen.';
		}
		await check();
		await invalidateAll();
		busy = false;
	}

	async function turnOff() {
		busy = true;
		await disablePush().catch(() => {});
		await check();
		await invalidateAll();
		busy = false;
	}

	async function test() {
		busy = true;
		const { reached } = await testPush().catch(() => ({ reached: 0 }));
		note = reached
			? 'Testmitteilung verschickt – sie sollte gleich erscheinen.'
			: 'Kein Gerät erreicht. Schalte Push aus und wieder ein.';
		busy = false;
	}

	const others = $derived(data.devices.length);
</script>

<svelte:head><title>Mitteilungen · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 36px">
	<div class="stack" style="--gap: 6px">
		<a class="back muted small row" href="/profil"><ChevronLeft size={16} /> Profil</a>
		<h1>Mitteilungen</h1>
		<p class="muted">
			Wähle, woran Fotocomp dich erinnert – per Push aufs Handy und/oder per Mail.
		</p>
	</div>

	<!-- Push auf diesem Gerät -->
	<section class="card stack" style="--gap: 14px">
		<div class="row" style="--gap: 10px">
			<BellRing size={18} /><strong>Push auf diesem Gerät</strong>
		</div>
		{#if status === 'loading'}
			<p class="muted">…</p>
		{:else if status === 'on'}
			<p>
				<span class="ok">● Aktiv</span>
				<span class="muted">– Mitteilungen kommen auf dieses Gerät.</span>
			</p>
			<div class="row" style="--gap: 8px">
				<button class="btn" onclick={test} disabled={busy}>Testmitteilung senden</button>
				<button class="btn ghost" onclick={turnOff} disabled={busy}>Ausschalten</button>
			</div>
		{:else if status === 'off'}
			<p class="muted">Push ist auf diesem Gerät noch nicht eingeschaltet.</p>
			<div>
				<button class="btn accent" onclick={turnOn} disabled={busy}>Push einschalten</button>
			</div>
		{:else if status === 'denied'}
			<p class="muted">
				Mitteilungen sind für Fotocomp blockiert. Erlauben kannst du sie in den
				{device === 'ios'
					? 'iOS-Einstellungen → Mitteilungen → Fotocomp.'
					: device === 'android'
						? 'Android-Einstellungen: lange auf das Fotocomp-Symbol tippen → App-Info → Benachrichtigungen.'
						: 'Website-Einstellungen deines Browsers (Schloss-Symbol neben der Adresse).'}
			</p>
		{:else if status === 'install'}
			<p class="muted">
				Auf dem iPhone gibt es Push nur, wenn Fotocomp auf dem Home-Bildschirm installiert ist:
			</p>
			<InstallGuide only="ios" />
		{:else}
			<p class="muted">
				Dieser Browser unterstützt keine Push-Mitteilungen. Mails funktionieren trotzdem.
			</p>
		{/if}
		{#if note}<p class="muted small">{note}</p>{/if}
		{#if others > 0 && status !== 'on'}
			<p class="muted small">
				Push ist aktiv auf: {data.devices.map((d) => d.device ?? 'Gerät').join(', ')}
			</p>
		{/if}
	</section>

	<!-- Welche Mitteilungen über welchen Kanal -->
	<form
		method="POST"
		class="stack"
		style="--gap: 20px"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
	>
		<div class="matrix">
			<span></span>
			<span class="head">Push</span>
			<span class="head">Mail</span>
			{#each NOTIFY_KINDS as kind (kind.key)}
				<span class="label">
					{kind.label}
					<span class="muted small">{kind.hint}</span>
				</span>
				<label class="cell" aria-label="{kind.label} per Push">
					<input type="checkbox" name="{kind.key}.push" checked={data.prefs[kind.key].push} />
				</label>
				<label class="cell" aria-label="{kind.label} per Mail">
					<input type="checkbox" name="{kind.key}.mail" checked={data.prefs[kind.key].mail} />
				</label>
			{/each}
		</div>
		<p class="muted small">
			Pro Zeitpunkt kommt höchstens eine Mail und eine Push-Mitteilung, auch bei mehreren Themen.
			Push schweigt nachts von 22 bis 7 Uhr; das Resultat kommt dann um 7 Uhr.
		</p>

		<fieldset class="stack chat" style="--gap: 10px">
			<legend>Chat <span class="muted small">· nur per Push</span></legend>
			<label class="check">
				<input type="checkbox" name="chat.direct" checked={data.chat.direct} />
				Nachrichten in Einzelchats
			</label>
			<label class="check">
				<input type="checkbox" name="chat.mentions" checked={data.chat.mentions} />
				Wenn mich jemand mit @ erwähnt
			</label>
			<label class="check">
				<input type="checkbox" name="chat.replies" checked={data.chat.replies} />
				Antworten auf meine Nachrichten
			</label>
			<label>
				Themen-Chats
				<select name="chat.theme" style="width: auto">
					<option value="all" selected={data.chat.theme === 'all'}>Alle Nachrichten</option>
					<option value="mentions" selected={data.chat.theme === 'mentions'}>
						Nur Erwähnungen und Antworten
					</option>
					<option value="off" selected={data.chat.theme === 'off'}>Keine</option>
				</select>
			</label>
			<p class="muted small">
				{data.isAdmin ? 'Als Admin bekommst du jede neue Nachricht im Hilfe-Chat. ' : ''}Einzelne
				Chats kannst du im Chat selbst stummschalten (Glocke oben rechts). Nachts kommen nur
				Einzelchats, Erwähnungen und Antworten.
			</p>
		</fieldset>

		<div class="row">
			<button class="btn primary">Speichern</button>
			{#if form?.saved}<span class="muted small">Gespeichert</span>{/if}
		</div>
	</form>

	<details class="card">
		<summary>Fotocomp als App installieren</summary>
		<div class="guide stack" style="--gap: 20px">
			<div class="stack" style="--gap: 10px">
				<strong>iPhone und iPad</strong>
				<InstallGuide only="ios" />
			</div>
			<div class="stack" style="--gap: 10px">
				<strong>Android</strong>
				<InstallGuide only="android" />
			</div>
		</div>
	</details>

	<details class="card">
		<summary>Push kommt nicht an?</summary>
		<ul class="guide">
			<li>
				Auf dem iPhone kommt Push nur in der installierten App (ab iOS 16.4), nicht in Safari.
			</li>
			<li>Mit «Testmitteilung senden» oben prüfst du, ob dieses Gerät erreicht wird.</li>
			<li>
				iPhone: Einstellungen → Mitteilungen → Fotocomp → «Mitteilungen erlauben». Prüfe auch, ob
				ein Fokus (z.B. «Nicht stören») aktiv ist.
			</li>
			<li>
				Android: App-Info → Benachrichtigungen erlauben; Energiesparmodus kann Push verzögern.
			</li>
			<li>
				Hilft nichts: Push ausschalten, Fotocomp vom Home-Bildschirm löschen und neu installieren.
			</li>
		</ul>
	</details>
</div>

<style>
	.back {
		--gap: 4px;
		width: fit-content;
	}

	.ok {
		color: var(--ok);
	}

	p {
		margin: 0;
	}

	fieldset.chat {
		margin: 8px 0 0;
		padding: 0;
		border: 0;
	}

	fieldset.chat legend {
		margin-bottom: 10px;
		font-weight: 600;
	}

	.matrix {
		display: grid;
		grid-template-columns: 1fr 56px 56px;
		align-items: center;
		row-gap: 4px;
	}

	.head {
		text-align: center;
		font-size: 13px;
		color: var(--muted);
	}

	.label {
		display: grid;
		gap: 2px;
		padding: 10px 0;
		border-top: 1px solid var(--line);
	}

	.cell {
		display: grid;
		place-items: center;
		align-self: stretch;
		border-top: 1px solid var(--line);
		cursor: pointer;
	}

	.cell input {
		width: 20px;
		height: 20px;
		accent-color: var(--accent);
	}

	details summary {
		cursor: pointer;
		font-weight: 600;
	}

	.guide {
		margin-top: 16px;
	}

	ul.guide {
		display: grid;
		gap: 8px;
		padding-left: 20px;
		line-height: 1.5;
	}
</style>
