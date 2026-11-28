<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, ChevronLeft, Ellipsis, Upload } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Podium from '#lib/components/Podium.svelte';
	import ThemeGallery from '#lib/components/ThemeGallery.svelte';
	import { photoSrc } from '#lib/media.ts';
	import { WEEKDAYS, formatDay, formatShortDay } from '#lib/schedule.ts';
	import type { Task } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const theme = $derived(data.theme);

	const action: Record<Task['kind'], string> = {
		upload: 'Hochladen',
		vote: 'Bewerten',
		weekly: 'Wählen',
		feedback: 'Feedback'
	};
	const label: Record<Task['kind'], string> = {
		upload: 'Foto des Tages',
		vote: 'Bewertung',
		weekly: 'Wochenfoto',
		feedback: 'Feedback-Runde'
	};

	const meta = $derived(
		[
			`${data.members.length} dabei`,
			data.phase.kind === 'ended'
				? 'beendet'
				: data.phase.kind === 'upcoming'
					? `startet ${formatShortDay(theme.startDate)}`
					: theme.endDate
						? `läuft bis ${formatShortDay(theme.endDate)}`
						: 'wiederkehrend',
			theme.weeklyVoteDay ? `Wochenfoto am ${WEEKDAYS[theme.weeklyVoteDay - 1]}` : null
		].filter(Boolean)
	);

	/** Schnellzugriffe unter den Aufgaben */
	const chips = $derived(
		[
			data.isMine && data.tasks.some((t) => t.kind === 'weekly')
				? { href: `/themen/${theme.id}/wochenfoto`, text: 'Wochenfoto', dot: false }
				: null,
			data.isMine && data.tasks.some((t) => t.kind === 'feedback')
				? {
						href: `/themen/${theme.id}/feedback`,
						text: 'Feedback-Runde',
						dot: data.tasks.some((t) => t.kind === 'feedback' && !t.done)
					}
				: null,
			data.chat
				? { href: `/chat/${data.chat.id}`, text: 'Gruppenchat', dot: data.chat.unread > 0 }
				: null,
			{ href: `/themen/${theme.id}/details`, text: 'Details', dot: false }
		].filter((c) => c !== null)
	);
</script>

<svelte:head><title>{theme.title} · Fotocomp</title></svelte:head>

<!-- Titelbild mit Titel, Beschreibung und Eckdaten -->
<div class="hero" class:nocover={!data.cover}>
	{#if data.cover}
		<img src={photoSrc(data.cover, 1200)} alt="" />
	{/if}
	<span class="shade" aria-hidden="true"></span>
	<header class="bar">
		<a class="back" href="/themen"><ChevronLeft size={22} /> Themen</a>
		<a class="round" href="/themen/{theme.id}/details" aria-label="Details zum Thema">
			<Ellipsis size={22} />
		</a>
	</header>
	<div class="hero-text">
		<h1>{theme.title}</h1>
		{#if theme.description}<p class="desc">{theme.description}</p>{/if}
		<p class="meta">{meta.join(' · ')}</p>
	</div>
</div>

<div class="page narrow thema">
	<!-- Mitmachen bzw. Aufgaben -->
	{#if data.phase.kind === 'ended'}
		<p class="tile muted">Dieses Thema ist beendet. Die Fotos bleiben hier zu sehen.</p>
	{:else if !data.isMine}
		<form method="POST" action="?/join" class="tile join" use:enhance>
			<span>
				<strong>Mach mit!</strong>
				<span class="muted small">
					{data.phase.kind === 'upcoming'
						? `Das Thema startet am ${formatDay(theme.startDate)}.`
						: 'Jeden Tag ein Foto zum Thema, am Abend wird bewertet.'}
				</span>
			</span>
			<button class="go">Mitmachen</button>
		</form>
	{:else if data.tasks.length}
		<section class="tile tasks">
			{#each data.tasks as task (task.kind)}
				<div class="task" class:finished={task.done}>
					<p class="task-head">
						<span>{label[task.kind]}</span>
						<span class="muted">{task.detail}</span>
					</p>
					<div class="task-row">
						{#if task.kind === 'upload' && data.who}
							<span class="who">
								<span class="faces" aria-hidden="true">
									{#each data.who.done.slice(0, 4) as person (person.id)}
										<Avatar name={person.name} id={person.id} size={28} />
									{/each}
									{#each { length: Math.max(0, Math.min(4, data.who.total - 1) - data.who.done.length) }, i (i)}
										<span class="empty-face"></span>
									{/each}
								</span>
								<span class="muted small">
									{data.who.done.length + (data.who.mine ? 1 : 0)} von {data.who.total}{data.who
										.mine
										? ''
										: ' · du fehlst'}
								</span>
							</span>
						{:else}
							<span class="muted small">{task.title}</span>
						{/if}
						{#if task.done}
							<a class="go done" href={task.href} aria-label={task.title}>
								<Check size={18} strokeWidth={2.4} />
							</a>
						{:else}
							<a class="go" href={task.href}>
								{#if task.kind === 'upload'}<Upload size={16} strokeWidth={2.2} />{/if}
								{action[task.kind]}
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</section>
	{:else if data.phase.kind === 'upcoming'}
		<p class="tile muted">Das Thema startet am {formatDay(theme.startDate)}. Du bist dabei!</p>
	{/if}

	<nav class="chips" aria-label="Mehr zum Thema">
		{#each chips as chip (chip.href)}
			<a href={chip.href}>
				{chip.text}{#if chip.dot}<span class="dot"></span>{/if}
			</a>
		{/each}
	</nav>

	<!-- Das Neueste zuerst: Siegertreppchen -->
	{#if data.gallery.highlight}
		{@const h = data.gallery.highlight}
		<p class="section">
			<span>{h.title}</span>
			<span class="muted small">{h.subtitle}</span>
		</p>
		<section class="tile podium">
			<Podium photos={h.photos} />
		</section>
	{/if}

	{#if data.gallery.days.length}
		<p class="section">
			<span>Alle Fotos</span>
		</p>
		<ThemeGallery days={data.gallery.days} />
	{:else if data.phase.kind !== 'upcoming' && !data.gallery.highlight}
		<p class="muted">
			Noch keine enthüllten Fotos. Die ersten erscheinen nach der ersten Bewertung.
		</p>
	{/if}

	{#if data.isMine && data.phase.kind !== 'ended'}
		<form
			method="POST"
			action="?/leave"
			use:enhance={({ cancel }) => {
				if (!confirm(`«${theme.title}» wirklich verlassen? Deine Fotos bleiben erhalten.`))
					cancel();
			}}
		>
			<button class="leave">Thema verlassen</button>
		</form>
	{/if}
</div>

<style>
	/* ---------------------------------------------------------- Titelbild */
	.hero {
		position: relative;
		height: calc(380px + var(--safe-top));
		max-width: 600px;
		margin: 0 auto;
		overflow: hidden;
		background: var(--surface);
	}

	.hero.nocover {
		height: calc(240px + var(--safe-top));
	}

	.hero img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgb(0 0 0 / 0.3) 0,
			rgb(0 0 0 / 0) calc(var(--safe-top) + 72px),
			rgb(0 0 0 / 0.1) 50%,
			var(--bg) 100%
		);
	}

	.bar {
		position: absolute;
		top: var(--safe-top);
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 56px;
		padding: 0 8px;
		color: #fff;
		text-shadow: 0 1px 8px rgb(0 0 0 / 0.45);
	}

	.nocover .bar {
		color: var(--text);
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 8px 6px;
		font-size: 16px;
		font-weight: 700;
	}

	.round {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
	}

	.hero-text {
		position: absolute;
		left: 20px;
		right: 20px;
		bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.hero-text h1 {
		font-size: 32px;
		line-height: 1.05;
		letter-spacing: -0.03em;
	}

	.desc {
		font-size: 15px;
		line-height: 1.45;
		color: color-mix(in srgb, var(--text) 85%, transparent);
	}

	.meta {
		font-size: 13px;
		color: var(--muted);
	}

	/* Am Computer gibt es die normale Kopfzeile, also keinen Zurück-Knopf auf dem Bild */
	@media (min-width: 721px) {
		.hero {
			margin-top: 24px;
			border-radius: var(--radius);
		}

		.bar {
			display: none;
		}
	}

	/* ---------------------------------------------------------- Inhalt */
	.thema {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		padding-top: 8px;
	}

	.tile {
		border-radius: var(--radius);
		background: var(--surface);
		padding: 14px;
	}

	.join {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.join > span {
		display: grid;
		gap: 2px;
	}

	.tasks {
		display: flex;
		flex-direction: column;
	}

	.task + .task {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--line);
	}

	.task-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 10px;
		font-size: 15px;
		font-weight: 600;
	}

	.task-head .muted {
		font-size: 14px;
		font-weight: 400;
	}

	.finished .task-head > span:first-child {
		color: var(--muted);
	}

	.task-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.who {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.faces {
		display: flex;
		padding-left: 8px;
	}

	.faces > :global(*) {
		margin-left: -8px;
		box-shadow: 0 0 0 2px var(--surface);
	}

	.empty-face {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px dashed color-mix(in srgb, var(--muted) 45%, transparent);
		background: var(--surface);
	}

	.go {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex: none;
		padding: 10px 14px;
		border: 0;
		border-radius: var(--radius-sm);
		background: var(--accent);
		color: var(--accent-text);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}

	.go.done {
		padding: 9px;
		background: color-mix(in srgb, var(--ok) 14%, transparent);
		color: var(--ok);
	}

	.chips {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 calc(-1 * var(--gutter));
		padding: 0 var(--gutter);
	}

	.chips a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex: none;
		padding: 9px 14px;
		border-radius: 999px;
		background: var(--surface);
		font-size: 14px;
		font-weight: 700;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--accent);
	}

	.section {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 12px 4px 0;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.section .muted {
		font-weight: 400;
		letter-spacing: 0;
	}

	.podium {
		display: grid;
		justify-items: center;
	}

	.leave {
		width: 100%;
		margin-top: 12px;
		padding: 12px;
		border: 0;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
</style>
