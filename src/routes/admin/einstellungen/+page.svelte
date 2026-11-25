<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleCheck, ExternalLink } from '@lucide/svelte';
	import {
		DEFAULT_RETENTION_DAYS,
		RETENTION_OPTIONS,
		adminRetention,
		retentionLabel
	} from '#lib/chat-rules.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const u = $derived(data.update);

	let policy = $derived(data.settings.updatePolicy);
	let updating = $state(false);
	let waited = $state(false);

	const policies = $derived([
		{ value: 'all', label: 'Automatisch – alle Versionen', hint: 'Empfohlen' },
		{ value: 'major', label: `Automatisch – nur innerhalb ${u.ranges.major}` },
		{ value: 'minor', label: `Automatisch – nur innerhalb ${u.ranges.minor}` },
		{ value: 'manual', label: 'Manuell', hint: 'Updates nur über den Knopf unten' }
	]);

	/** Nach dem Auftrag warten, bis die App mit einer neuen Version antwortet, dann neu laden. */
	async function waitForNewVersion() {
		updating = true;
		const started = Date.now();
		while (Date.now() - started < 5 * 60_000) {
			await new Promise((r) => setTimeout(r, 4000));
			try {
				const res = await fetch('/api/health', { cache: 'no-store' });
				const version = res.headers.get('x-fotocomp-version');
				if (res.ok && version && version !== u.installed) return location.reload();
			} catch {
				// App startet gerade neu
			}
		}
		updating = false;
		waited = true;
	}
</script>

<svelte:head><title>Einstellungen · Admin · Fotocomp</title></svelte:head>

<div class="stack" style="--gap: 48px; max-width: 560px">
	<form
		method="POST"
		action="?/general"
		class="stack"
		style="--gap: 28px"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
	>
		<fieldset class="stack" style="--gap: 10px">
			<legend>Registrierung</legend>
			<label class="check">
				<input
					type="radio"
					name="registration"
					value="open"
					checked={data.settings.registration === 'open'}
				/>
				Offen – jeder mit dem Link kann sich registrieren
			</label>
			<label class="check">
				<input
					type="radio"
					name="registration"
					value="invite"
					checked={data.settings.registration === 'invite'}
				/>
				Nur mit Einladung
			</label>
		</fieldset>

		<fieldset class="stack" style="--gap: 10px">
			<legend>Themen erstellen dürfen</legend>
			<label class="check">
				<input
					type="radio"
					name="themeCreation"
					value="admins"
					checked={data.settings.themeCreation === 'admins'}
				/>
				Nur Admins
			</label>
			<label class="check">
				<input
					type="radio"
					name="themeCreation"
					value="all"
					checked={data.settings.themeCreation === 'all'}
				/>
				Alle Benutzer
			</label>
		</fieldset>

		<div class="row">
			<button class="btn primary">Speichern</button>
			{#if form?.saved === 'general'}<span class="muted small">Gespeichert</span>{/if}
		</div>
	</form>

	<form
		method="POST"
		action="?/chat"
		class="stack"
		style="--gap: 10px"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
	>
		<h2 class="legend">Chat</h2>
		<label>
			Nachrichten löschen nach
			<select name="chatRetentionDays" style="width: auto">
				{#each RETENTION_OPTIONS as d (d)}
					<option value={d} selected={adminRetention(data.settings.chatRetentionDays) === d}>
						{retentionLabel(d)}{d === DEFAULT_RETENTION_DAYS ? ' (Standard)' : ''}
					</option>
				{/each}
			</select>
		</label>
		<p class="muted small">
			Gilt für alle Chats. Jede Person kann für ihre eigenen Nachrichten eine kürzere Zeit wählen.
			Kürzer gilt sofort auch für bestehende Nachrichten.
		</p>
		<div class="row">
			<button class="btn primary">Speichern</button>
			{#if form?.saved === 'chat'}<span class="muted small">Gespeichert</span>{/if}
		</div>
	</form>

	<section id="updates" class="stack" style="--gap: 20px">
		<h2 class="legend">Updates</h2>

		{#if !u.configured}
			<div class="notice stack" style="--gap: 6px">
				<strong>
					{u.setup === 'missing-token'
						? 'Update-Steuerung noch nicht eingerichtet'
						: 'Update-Steuerung funktioniert nicht'}
				</strong>
				<span>{data.setupText}</span>
				<span class="muted small">Anleitung: README → «Updates» und «Fehlerbehebung».</span>
			</div>
		{/if}

		<form
			method="POST"
			action="?/policy"
			class="stack"
			style="--gap: 10px"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
		>
			{#each policies as p (p.value)}
				<label class="check">
					<input type="radio" name="updatePolicy" value={p.value} bind:group={policy} />
					<span>
						{p.label}
						{#if p.hint}<span class="muted small">· {p.hint}</span>{/if}
					</span>
				</label>
			{/each}
			<div class="row" style="margin-top: 8px">
				<button class="btn primary" disabled={policy === data.settings.updatePolicy}>
					Speichern
				</button>
				{#if form?.saved === 'policy'}<span class="muted small">Gespeichert</span>{/if}
			</div>
		</form>

		{#if u.updateAvailable}
			<div class="card stack update" style="--gap: 12px">
				<p>
					<strong>{u.latest}</strong> ist verfügbar.
					{#if u.automatic && u.configured}
						<span class="muted">
							Sie wird in der Nacht um {data.checkHour} Uhr automatisch installiert – oder gleich jetzt:
						</span>
					{:else if u.configured && u.policy !== 'manual'}
						<span class="muted">
							Sie liegt ausserhalb deiner Einstellung und wird nicht automatisch installiert.
						</span>
					{/if}
				</p>
				<a class="small" href="{u.releasesUrl}/tag/{u.latest}" target="_blank" rel="noopener">
					Was ist neu?
				</a>
				{#if updating}
					<p class="muted">
						Update läuft … Die Seite lädt neu, sobald die neue Version bereit ist (meist 1–2
						Minuten).
					</p>
				{:else}
					<form
						method="POST"
						action="?/update"
						use:enhance={() =>
							async ({ result, update }) => {
								if (result.type === 'success' && result.data?.update === 'started')
									void waitForNewVersion();
								else await update();
							}}
					>
						<button class="btn accent" disabled={!u.configured}>Jetzt aktualisieren</button>
					</form>
				{/if}
				{#if form?.update === 'nothing'}
					<p class="muted small">
						Watchtower hat noch kein neues Image gefunden. Direkt nach einem Release wird es noch
						gebaut – versuche es in ein paar Minuten nochmals.
					</p>
				{/if}
				{#if waited}
					<p class="muted small">
						Die neue Version meldet sich noch nicht. Lade die Seite später neu oder schau im
						Container Manager nach.
					</p>
				{/if}
				{#if form?.updateError}<p class="error">{form.updateError}</p>{/if}
			</div>
		{:else if u.latest}
			<p class="current row">
				<CircleCheck size={16} /> Fotocomp {u.installed} ist auf dem neuesten Stand.
			</p>
		{/if}

		<!-- Gesucht wird einmal täglich in der Nacht; hier auch sofort -->
		<form method="POST" action="?/check" class="row check-now" use:enhance>
			<button class="btn small">Jetzt nach Updates suchen</button>
			<span class="muted small">
				{#if form?.checked === 'failed' || (u.checkFailed && !form?.checked)}
					GitHub war nicht erreichbar – bitte später nochmals versuchen.
				{:else if form?.checked === 'current'}
					Gesucht: keine neue Version.
				{:else}
					Zuletzt gesucht: {data.checked} · automatisch täglich um {data.checkHour} Uhr
				{/if}
			</span>
			<a
				class="muted small row"
				style="--gap: 4px"
				href={u.releasesUrl}
				target="_blank"
				rel="noopener"
			>
				Versionsübersicht <ExternalLink size={13} />
			</a>
		</form>
	</section>
</div>

<style>
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}

	legend,
	.legend {
		font-size: inherit;
		font-weight: 600;
		margin: 0 0 10px;
	}

	.current {
		--gap: 8px;
		margin: 0;
		color: var(--ok);
	}

	.check-now {
		--gap: 6px 14px;
		flex-wrap: wrap;
	}

	.check-now a {
		margin-left: auto;
	}

	.update p {
		margin: 0;
	}
</style>
