<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, ChevronRight, Star, Upload } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import InstallHint from '#lib/components/InstallHint.svelte';
	import { photoSrc, photoSrcset } from '#lib/media.ts';
	import type { Task } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const seen = (body: object) =>
		fetch('/api/gesehen', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});

	// Erst nach dem Anzeigen zählen (nicht schon beim Vorladen): Jede Neuigkeit
	// erscheint höchstens zweimal, danach verschwindet sie
	onMount(() => {
		const keys = [
			...data.groups.flatMap((g) => g.news.map((n) => n.key)),
			...data.chatNews.map((n) => n.key)
		];
		void seen({ at: data.seenAt, keys });
	});

	/** Angetippt: gilt als gesehen und erscheint nicht mehr. */
	const opened = (key: string) => void seen({ done: key });

	/** Aufgaben aller Themen, offene zuerst (Reihenfolge der Themen bleibt). */
	const rows = $derived(
		data.groups
			.flatMap((g) => g.tasks.map((task) => ({ task, theme: g.theme, who: g.who })))
			.sort((a, b) => Number(a.task.done) - Number(b.task.done))
	);

	/** Neuigkeiten aus allen Themen und dem Chat, neueste zuerst. */
	const news = $derived(
		[
			...data.groups.flatMap((g) => g.news.map((n) => ({ ...n, theme: g.theme.title }))),
			...data.chatNews.map((n) => ({ ...n, theme: 'Chat' }))
		].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
	);

	const quiet = $derived(data.groups.filter((g) => !g.open && !g.news.length && !g.tasks.length));

	const action: Record<Task['kind'], string> = {
		upload: 'Hochladen',
		vote: 'Bewerten',
		weekly: 'Wählen',
		feedback: 'Feedback'
	};

	const MONTHS = [
		'Jan.',
		'Feb.',
		'März',
		'Apr.',
		'Mai',
		'Juni',
		'Juli',
		'Aug.',
		'Sep.',
		'Okt.',
		'Nov.',
		'Dez.'
	];
	/** «23.–29. Nov.» oder «30. Nov. – 6. Dez.» */
	const weekRange = $derived.by(() => {
		const [, fm, fd] = data.week.from.split('-').map(Number);
		const [, tm, td] = data.week.to.split('-').map(Number);
		return fm === tm
			? `${fd}.–${td}. ${MONTHS[tm - 1]}`
			: `${fd}. ${MONTHS[fm - 1]} – ${td}. ${MONTHS[tm - 1]}`;
	});

	const fmt = (n: number) => n.toFixed(1);
</script>

<svelte:head><title>Heute · Fotocomp</title></svelte:head>

<!-- Titelbild: der jüngste Tagessieg in deinen Themen -->
{#if data.hero}
	<a class="hero" href="/foto/{data.hero.photoId}">
		<img
			src={photoSrc(data.hero.photoId, 1200)}
			srcset={photoSrcset(data.hero.photoId)}
			sizes="(max-width: 600px) 100vw, 600px"
			alt="Tagessieg von {data.hero.userName} im Thema {data.hero.themeTitle}"
		/>
		<span class="shade" aria-hidden="true"></span>
		<span class="date">{data.shortDay}</span>
		<span class="caption">
			<span class="kicker">Tagessieg · {data.hero.themeTitle}</span>
			<span class="name">{data.hero.userName}</span>
			<span class="score">
				<Star size={15} fill="currentColor" strokeWidth={0} />
				<strong>{fmt(data.hero.average)}</strong>
				<span>aus {data.hero.votes} {data.hero.votes === 1 ? 'Stimme' : 'Stimmen'}</span>
			</span>
		</span>
	</a>
{/if}

<div class="page narrow heute" class:with-hero={data.hero}>
	{#if !data.hero}
		<header class="title">
			<p class="muted small">{data.day}</p>
			<h1>Heute</h1>
		</header>
	{/if}

	<InstallHint />

	{#if !data.groups.length && !data.chatNews.length}
		<div class="empty">
			<h2>Wähle ein Thema, um loszulegen.</h2>
			<p class="muted">Jeden Tag ein Foto zum Thema, am Abend wird gegenseitig bewertet.</p>
			<div><a class="btn accent" href="/themen">Zu den Themen</a></div>
		</div>
	{:else}
		<!-- Heute zu tun -->
		<h2 class="section">Heute zu tun</h2>
		<section class="tile todo">
			<p class="todo-head">
				<span class:done={!data.openTotal}>
					{#if !data.openTotal}<Check size={18} strokeWidth={2.4} />{/if}
					{data.headline}
				</span>
				{#if data.remaining}<span class="muted">{data.remaining}</span>{/if}
			</p>
			{#if rows.length}
				<ul>
					{#each rows as { task, theme, who } (`${theme.id}:${task.kind}`)}
						<li class:finished={task.done}>
							<span class="what">
								<a class="theme" href="/themen/{theme.id}">{theme.title}</a>
								{#if task.kind === 'upload' && who}
									<span class="who">
										<span class="faces" aria-hidden="true">
											{#each who.done.slice(0, 4) as person (person.id)}
												<Avatar name={person.name} id={person.id} size={28} />
											{/each}
											{#each { length: Math.max(0, Math.min(4, who.total - 1) - who.done.length) }, i (i)}
												<span class="empty-face"></span>
											{/each}
										</span>
										<span class="muted small">
											{who.done.length + (who.mine ? 1 : 0)} von {who.total}{who.mine
												? ''
												: ' · du fehlst noch'}
										</span>
									</span>
								{:else}
									<span class="muted small">{task.title} · {task.detail}</span>
								{/if}
							</span>
							{#if task.done}
								<a class="go done" href={task.href} aria-label="{task.title}: {theme.title}">
									<Check size={18} strokeWidth={2.4} />
								</a>
							{:else}
								<a class="go" href={task.href}>
									{#if task.kind === 'upload'}<Upload size={16} strokeWidth={2.2} />{/if}
									{action[task.kind]}
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Eigene Bilanz der Woche -->
		<section class="tile week">
			<p class="week-head">
				<span>Diese Woche</span>
				<span class="muted">{weekRange}</span>
			</p>
			<div class="stats">
				<span><span class="muted">Fotos</span><strong>{data.week.photos}</strong></span>
				<span><span class="muted">Tagessiege</span><strong>{data.week.wins}</strong></span>
				<span>
					<span class="muted">Ø Sterne</span>
					<strong>{data.week.average === null ? '–' : fmt(data.week.average)}</strong>
				</span>
			</div>
			<div class="bars" role="img" aria-label="Deine Fotos dieser Woche, Höhe nach Sterneschnitt">
				{#each data.week.days as d (d.day)}
					<span class="bar" class:is-today={d.isToday} class:future={d.future}>
						<span
							class="fill"
							class:on={d.value !== null}
							style="height: {d.value === null ? 4 : Math.max(12, (d.value / 5) * 62)}px"
						></span>
						<span class="label">{d.label}</span>
					</span>
				{/each}
			</div>
		</section>

		<!-- Neu für dich -->
		{#if news.length}
			<h2 class="section">Neu für dich</h2>
			<div class="news">
				{#each news as item (item.key)}
					<a class="tile item" href={item.href} onclick={() => opened(item.key)}>
						{#if item.photoId}
							<img class="thumb" src={photoSrc(item.photoId, 480)} alt="" loading="lazy" />
						{:else}
							<span class="thumb" aria-hidden="true"></span>
						{/if}
						<span class="text">
							<span class="item-title">{item.title}</span>
							<span class="muted small line">{item.text}</span>
							<span class="muted tiny">{item.when} · {item.theme}</span>
						</span>
						{#if item.isNew}<span class="dot" title="Neu"></span>{/if}
					</a>
				{/each}
			</div>
		{/if}

		{#if quiet.length}
			<div class="tile quiet">
				{#each quiet as g (g.theme.id)}
					<a href="/themen/{g.theme.id}">
						<span>{g.theme.title}</span>
						<span class="muted small">
							{g.upcoming ? `startet ${g.upcoming}` : 'nichts zu tun'}
						</span>
						<ChevronRight size={16} class="chevron" />
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* ---------------------------------------------------------- Titelbild */
	.hero {
		position: relative;
		display: block;
		height: calc(440px + var(--safe-top));
		max-width: 600px;
		margin: 0 auto;
		overflow: hidden;
		background: var(--photo-bg);
	}

	.hero img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 35%;
	}

	.shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgb(0 0 0 / 0.3) 0,
			rgb(0 0 0 / 0) calc(var(--safe-top) + 72px),
			rgb(0 0 0 / 0) 55%,
			var(--bg) 100%
		);
	}

	.date {
		position: absolute;
		top: var(--safe-top);
		right: var(--gutter);
		height: var(--nav-h);
		display: flex;
		align-items: center;
		font-size: 13px;
		color: rgb(255 255 255 / 0.85);
		text-shadow: 0 1px 8px rgb(0 0 0 / 0.45);
	}

	.caption {
		position: absolute;
		left: 20px;
		right: 20px;
		bottom: 18px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		color: var(--text);
	}

	.kicker {
		font-size: 13px;
		color: color-mix(in srgb, var(--text) 70%, transparent);
	}

	.name {
		font-size: 32px;
		line-height: 1.05;
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 14px;
		color: var(--accent);
	}

	.score strong {
		color: var(--text);
		font-weight: 600;
	}

	.score span {
		color: var(--muted);
	}

	@media (min-width: 721px) {
		.hero {
			margin-top: 24px;
			border-radius: var(--radius);
		}

		.date {
			display: none;
		}
	}

	/* ---------------------------------------------------------- Inhalt */
	.heute {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.heute.with-hero {
		padding-top: 8px;
	}

	.title {
		display: grid;
		gap: 4px;
		margin-bottom: 8px;
	}

	.empty {
		display: grid;
		gap: 16px;
		padding-top: 6vh;
	}

	.section {
		padding: 8px 4px 0;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.tile {
		border-radius: var(--radius);
		background: var(--surface);
		padding: 14px;
	}

	/* Heute zu tun */
	.todo-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		font-size: 15px;
		font-weight: 600;
	}

	.todo-head .done {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--ok);
	}

	.todo-head .muted {
		font-size: 14px;
		font-weight: 400;
		white-space: nowrap;
	}

	.todo ul {
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--line);
	}

	.todo li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
	}

	.todo li + li {
		border-top: 1px solid var(--line);
	}

	.what {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
		min-width: 0;
	}

	.theme {
		font-size: 16px;
		font-weight: 700;
	}

	.finished .theme {
		color: var(--muted);
		font-weight: 600;
	}

	.who {
		display: flex;
		align-items: center;
		gap: 8px;
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
		border-radius: var(--radius-sm);
		background: var(--accent);
		color: var(--accent-text);
		font-size: 14px;
		font-weight: 700;
	}

	.go.done {
		padding: 9px;
		background: color-mix(in srgb, var(--ok) 14%, transparent);
		color: var(--ok);
	}

	/* Diese Woche */
	.week {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.week-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-size: 17px;
		font-weight: 800;
	}

	.week-head .muted {
		font-size: 14px;
		font-weight: 400;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.stats > span {
		display: flex;
		flex-direction: column;
		font-size: 13px;
	}

	.stats > span + span {
		border-left: 1px solid var(--line);
		padding-left: 12px;
	}

	.stats strong {
		font-size: 26px;
		font-weight: 700;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}

	.bars {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 10px;
		align-items: end;
		height: 84px;
	}

	.bar {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.fill {
		width: 100%;
		border-radius: 4px;
		background: color-mix(in srgb, var(--muted) 30%, transparent);
	}

	.fill.on {
		background: var(--accent);
	}

	.future .fill {
		background: color-mix(in srgb, var(--muted) 15%, transparent);
	}

	.label {
		font-size: 12px;
		color: var(--muted);
	}

	.is-today .label {
		color: var(--text);
		font-weight: 700;
	}

	.future .label {
		opacity: 0.6;
	}

	/* Neu für dich */
	.news {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 8px;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
	}

	.thumb {
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: var(--radius-sm);
		object-fit: cover;
		background: var(--surface-2);
	}

	.text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.item-title {
		font-size: 15px;
		font-weight: 700;
	}

	.line {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tiny {
		font-size: 12px;
	}

	.dot {
		width: 8px;
		height: 8px;
		flex: none;
		border-radius: 50%;
		background: var(--accent);
	}

	/* Themen ohne Aufgaben */
	.quiet {
		display: grid;
		padding: 0 14px;
	}

	.quiet a {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 0;
	}

	.quiet a + a {
		border-top: 1px solid var(--line);
	}

	.quiet a :global(.chevron) {
		margin-left: auto;
		color: var(--muted);
	}
</style>
