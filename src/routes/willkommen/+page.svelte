<script lang="ts">
	import { Camera, ImagePlus, Layers, MessageCircle, Star, Trophy } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Die Einführung: kurze Schritte zum Wischen, am Schluss die Themenwahl. */
	const steps = $derived([
		{
			icon: Camera,
			title: `Willkommen, ${data.name}!`,
			text: 'Fotocomp ist ein privater Foto-Wettbewerb unter Freunden. Es gibt ein Thema – und jeden Tag ein Foto dazu.'
		},
		{
			icon: ImagePlus,
			time: '05:00 – 20:00',
			title: 'Foto upload',
			text: 'Lade dein Foto zum Thema hoch. Bis 20 Uhr kannst du es noch ersetzen. Die anderen sehen es erst am Abend.'
		},
		{
			icon: Star,
			time: '20:00 – 05:00',
			title: 'Bewerten',
			text: 'Am Abend gibst du den Fotos der anderen 1 bis 5 Sterne. Anonym – wer welches Foto gemacht hat, siehst du erst am Morgen.'
		},
		{
			icon: Trophy,
			time: 'ab 05:00',
			title: 'Resultat & Wochenfoto',
			text: 'Am Morgen siehst du, wer gewonnen hat. Einmal pro Woche wählen alle ihre drei Favoriten zum Wochenfoto.'
		},
		{
			icon: MessageCircle,
			time: 'freiwillig',
			title: 'Feedback',
			text: 'Wenn du magst, gibst und bekommst du freundschaftliches Feedback – mit Namen und nur für den Fotografen sichtbar.'
		}
	]);
	const total = $derived(steps.length + 1); // + Themenwahl

	let track: HTMLDivElement;
	let step = $state(0);
	let chosen = $state<number | null>(null);
	const last = $derived(step === total - 1);

	function go(i: number) {
		const target = Math.max(0, Math.min(total - 1, i));
		track.scrollTo({ left: target * track.clientWidth, behavior: 'smooth' });
	}

	/** Beim Wischen den aktuellen Schritt mitführen. */
	function onscroll() {
		step = Math.round(track.scrollLeft / track.clientWidth);
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement) return;
		if (e.key === 'ArrowRight') go(step + 1);
		if (e.key === 'ArrowLeft') go(step - 1);
	}
</script>

<svelte:head><title>Willkommen · Fotocomp</title></svelte:head>
<svelte:window {onkeydown} />

<div class="onboarding">
	<header>
		<div class="dots" aria-label="Schritt {step + 1} von {total}">
			{#each { length: total }, i (i)}
				<button
					class="dot"
					class:active={i === step}
					onclick={() => go(i)}
					aria-label="Schritt {i + 1}"
				></button>
			{/each}
		</div>
		{#if data.review}
			<a class="skip" href="/profil">Schliessen</a>
		{:else if !last}
			<button class="skip" onclick={() => go(total - 1)}>Überspringen</button>
		{/if}
	</header>

	<div class="track" bind:this={track} {onscroll}>
		{#each steps as s, i (i)}
			<section class="slide" aria-hidden={i !== step}>
				<div class="content">
					<div class="icon"><s.icon size={34} strokeWidth={1.5} /></div>
					{#if s.time}<span class="time">{s.time}</span>{/if}
					<h1>{s.title}</h1>
					<p>{s.text}</p>
				</div>
			</section>
		{/each}

		<!-- Letzter Schritt: genau ein Thema wählen -->
		<section class="slide" aria-hidden={!last}>
			<div class="content pick">
				<div class="icon"><Layers size={34} strokeWidth={1.5} /></div>
				{#if data.review}
					<h1>Alles klar?</h1>
					<p>Deine Themen verwaltest du unter «Themen». Viel Spass beim Fotografieren!</p>
				{:else if data.themes.length}
					<h1>Wähle dein erstes Thema</h1>
					<p>Starte mit einem Thema. Weitere kannst du später unter «Themen» dazunehmen.</p>
					<form id="pick" method="POST" action="?/start" class="choices">
						{#each data.themes as theme (theme.id)}
							<label class="choice" class:selected={chosen === theme.id}>
								<input type="radio" name="theme" value={theme.id} bind:group={chosen} required />
								<span class="choice-title">{theme.title}</span>
								{#if theme.description}<span class="choice-text">{theme.description}</span>{/if}
								<span class="choice-meta">
									{theme.members}
									{theme.members === 1 ? 'Teilnehmer' : 'Teilnehmende'}{theme.upcoming
										? ' · startet bald'
										: ''}
								</span>
							</label>
						{/each}
					</form>
					{#if form?.error}<p class="error">{form.error}</p>{/if}
				{:else}
					<h1>Noch läuft kein Thema</h1>
					<p>
						{data.canCreate
							? 'Erstelle das erste Thema – zum Beispiel «Holz» oder «Spiegelungen».'
							: 'Sobald ein Thema startet, kannst du mitmachen. Schau später unter «Themen» vorbei.'}
					</p>
				{/if}
			</div>
		</section>
	</div>

	<!-- Handy: dezenter Hinweis zum Wischen (nicht auf dem letzten Schritt) -->
	<p class="swipe-hint" class:hidden={last} aria-hidden="true">
		<span class="arrow left">‹</span> wischen <span class="arrow right">›</span>
	</p>

	<footer>
		<button
			class="btn ghost"
			style:visibility={step === 0 ? 'hidden' : 'visible'}
			onclick={() => go(step - 1)}
		>
			Zurück
		</button>
		{#if !last}
			<button class="btn primary" onclick={() => go(step + 1)}>Weiter</button>
		{:else if data.review}
			<a class="btn primary" href="/themen">Zu den Themen</a>
		{:else if data.themes.length}
			<button class="btn accent" form="pick" disabled={chosen === null}>
				Mitmachen & loslegen
			</button>
		{:else}
			<form method="POST" action="?/finish">
				<input type="hidden" name="create" value={data.canCreate ? '1' : '0'} />
				<button class="btn accent">{data.canCreate ? 'Erstes Thema erstellen' : 'Fertig'}</button>
			</form>
		{/if}
	</footer>
</div>

<style>
	/* Vollbild, unabhängig von der Navigation; auf grossen Bildschirmen schmal und zentriert */
	.onboarding {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		background: var(--bg);
		padding: max(16px, var(--safe-top)) 0 max(16px, env(safe-area-inset-bottom));
	}

	header,
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		max-width: 520px;
		margin: 0 auto;
		padding: 8px var(--gutter);
		min-height: 52px;
	}

	.dots {
		display: flex;
		gap: 6px;
	}

	.dot {
		width: 8px;
		height: 8px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--edge);
		cursor: pointer;
		transition:
			width 0.25s,
			background 0.25s;
	}

	.dot.active {
		width: 24px;
		background: var(--accent);
	}

	.skip {
		border: 0;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 14px;
		cursor: pointer;
		padding: 8px 0;
	}

	/* Schritte nebeneinander, Wischen rastet pro Schritt ein */
	.track {
		flex: 1;
		display: flex;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		overscroll-behavior-x: contain;
	}

	.track::-webkit-scrollbar {
		display: none;
	}

	.slide {
		flex: 0 0 100%;
		scroll-snap-align: center;
		scroll-snap-stop: always;
		overflow-y: auto;
		scrollbar-width: thin;
		display: flex;
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 14px;
		width: 100%;
		max-width: 520px;
		margin: auto;
		padding: 24px var(--gutter);
	}

	/* Handy: Text weiter oben, damit unten Platz für den Wisch-Hinweis bleibt */
	@media (max-width: 720px) {
		.content {
			margin: 6vh auto auto;
		}
	}

	.swipe-hint {
		display: none;
		justify-content: center;
		align-items: center;
		gap: 10px;
		margin: 0 0 4px;
		font-size: 13px;
		letter-spacing: 0.04em;
		color: var(--muted);
		opacity: 0.75;
		transition: opacity 0.3s;
	}

	.swipe-hint.hidden {
		opacity: 0;
	}

	@media (hover: none) and (max-width: 720px) {
		.swipe-hint {
			display: flex;
		}
	}

	.arrow {
		font-size: 18px;
		line-height: 1;
		animation: nudge 1.8s ease-in-out infinite;
	}

	.arrow.left {
		animation-name: nudge-left;
	}

	@keyframes nudge {
		50% {
			transform: translateX(4px);
		}
	}

	@keyframes nudge-left {
		50% {
			transform: translateX(-4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.arrow {
			animation: none;
		}
	}

	.pick {
		margin-top: 0;
		padding-top: 32px;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		margin-bottom: 8px;
		border-radius: 22px;
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		color: var(--accent);
	}

	.time {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}

	h1 {
		font-size: clamp(28px, 7vw, 36px);
		line-height: 1.15;
		margin: 0;
	}

	p {
		margin: 0;
		font-size: 17px;
		line-height: 1.55;
		color: color-mix(in srgb, var(--text) 82%, var(--muted));
	}

	/* Themenwahl: grosse, gut tippbare Karten, genau eine auswählbar */
	.choices {
		display: grid;
		gap: 10px;
		width: 100%;
		margin-top: 8px;
	}

	.choice {
		position: relative;
		display: grid;
		gap: 4px;
		padding: 16px 18px;
		border-radius: var(--radius);
		background: var(--surface);
		border: 1.5px solid var(--edge);
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.choice:hover {
		border-color: var(--muted);
	}

	.choice.selected {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface));
	}

	.choice input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.choice:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.choice-title {
		font-size: 17px;
		font-weight: 600;
		color: var(--text);
	}

	.choice-text {
		font-size: 15px;
		color: color-mix(in srgb, var(--text) 80%, var(--muted));
	}

	.choice-meta {
		font-size: 13px;
		color: var(--muted);
	}

	footer .btn {
		min-width: 120px;
	}

	footer .btn:disabled {
		opacity: 0.35;
	}
</style>
