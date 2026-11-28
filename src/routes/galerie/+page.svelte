<script lang="ts">
	import { Award, Star } from '@lucide/svelte';
	import { photoSrc, photoSrcset } from '#lib/media.ts';
	import { addDays, formatShortDay } from '#lib/schedule.ts';
	import { WOW_MIN_STARS } from '#lib/wow.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Filter nach Thema (nur im Browser, über die geladenen Wochen)
	let themeId = $state<number | null>(null);
	const themes = $derived(
		[
			...new Map(
				data.weeks.flatMap((w) => w.photos).map((p) => [p.theme?.id, p.theme?.title ?? ''])
			)
		]
			.filter((entry): entry is [number, string] => entry[0] !== undefined)
			.sort((a, b) => a[1].localeCompare(b[1]))
	);
	const weeks = $derived(
		data.weeks
			.map((w) => ({
				...w,
				photos: themeId === null ? w.photos : w.photos.filter((p) => p.themeId === themeId)
			}))
			.filter((w) => w.photos.length)
	);

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
	const range = (monday: string) => {
		const sunday = addDays(monday, 6);
		const [, fm, fd] = monday.split('-').map(Number);
		const [, tm, td] = sunday.split('-').map(Number);
		return fm === tm
			? `${fd}.–${td}. ${MONTHS[tm - 1]}`
			: `${fd}. ${MONTHS[fm - 1]} – ${td}. ${MONTHS[tm - 1]}`;
	};
	const title = (monday: string) =>
		monday === data.thisWeek
			? 'Diese Woche'
			: monday === addDays(data.thisWeek, -7)
				? 'Letzte Woche'
				: range(monday);

	const first = (name: string | null) => name?.split(' ')[0] ?? '';
</script>

<svelte:head><title>Galerie · Fotocomp</title></svelte:head>

<div class="page narrow galerie">
	<header class="title">
		<h1>Galerie</h1>
		<p class="muted small">Wochenfotos, Tagessieger und alles ab {WOW_MIN_STARS} Sternen.</p>
	</header>

	{#if themes.length > 1}
		<nav class="chips" aria-label="Nach Thema filtern">
			<button aria-pressed={themeId === null} onclick={() => (themeId = null)}>Alle Themen</button>
			{#each themes as [id, name] (id)}
				<button aria-pressed={themeId === id} onclick={() => (themeId = id)}>{name}</button>
			{/each}
		</nav>
	{/if}

	{#each weeks as week (week.week)}
		{@const [hero, ...rest] = week.photos}
		<p class="section">
			<span>{title(week.week)}</span>
			{#if title(week.week) !== range(week.week)}<span class="muted small">
					{range(week.week)}
				</span>{/if}
		</p>

		<!-- Das schönste Foto der Woche gross -->
		<a class="hero" href="/foto/{hero.id}">
			<img
				src={photoSrc(hero.id, 1200)}
				srcset={photoSrcset(hero.id)}
				sizes="(max-width: 600px) 100vw, 560px"
				alt="Foto von {hero.userName} im Thema {hero.theme?.title}"
			/>
			<span class="shade" aria-hidden="true"></span>
			{#if hero.badge}
				<span class="award">
					<Award size={14} />
					{hero.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}
				</span>
			{/if}
			<span class="hero-caption">
				<span class="hero-who">
					<strong>{hero.userName}</strong>
					<span>{hero.theme?.title} · {formatShortDay(hero.day)}</span>
				</span>
				{#if hero.average}
					<span class="hero-score">
						<Star size={14} fill="currentColor" strokeWidth={0} />{hero.average.toFixed(1)}
					</span>
				{/if}
			</span>
		</a>

		<!-- Mosaik in zwei Spalten, ohne Beschnitt -->
		{#if rest.length}
			<div class="mosaic">
				{#each rest as photo (photo.id)}
					<a
						class="tile"
						style="aspect-ratio: {photo.width} / {photo.height}"
						href="/foto/{photo.id}"
						aria-label="Foto von {photo.userName}{photo.badge
							? `, ${photo.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}`
							: `, ${photo.average?.toFixed(1)} Sterne`}"
					>
						<img src={photoSrc(photo.id, 1200)} alt="" loading="lazy" />
						<span class="tag">
							{#if photo.badge}
								<Award size={12} />
								{first(photo.userName)}
							{:else}
								★ {photo.average?.toFixed(1)} · {first(photo.userName)}
							{/if}
						</span>
					</a>
				{/each}
			</div>
		{/if}
	{:else}
		<p class="muted">
			Noch keine Fotos in der Galerie. Hier erscheinen die Sieger und die besten Fotos, sobald die
			ersten Bewertungen enthüllt sind.
		</p>
	{/each}

	{#if data.more}
		<a class="older" href="?bis={data.more}">Ältere Wochen</a>
	{/if}
</div>

<style>
	.galerie {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.title {
		display: grid;
		gap: 4px;
		padding: 0 4px;
	}

	.title h1 {
		font-size: 32px;
		line-height: 1.05;
		letter-spacing: -0.03em;
	}

	.chips {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 calc(-1 * var(--gutter));
		padding: 0 var(--gutter);
	}

	.chips button {
		flex: none;
		padding: 9px 14px;
		border: 0;
		border-radius: 999px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}

	.chips button[aria-pressed='true'] {
		background: var(--text);
		color: var(--bg);
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

	/* Titelbild der Woche */
	.hero {
		position: relative;
		display: block;
		overflow: hidden;
		border-radius: var(--radius);
		background: var(--photo-bg);
	}

	.hero img {
		width: 100%;
		max-height: 70vh;
		object-fit: cover;
	}

	.shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, transparent 50%, rgb(0 0 0 / 0.7) 100%);
	}

	.award {
		position: absolute;
		top: 12px;
		left: 12px;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-text);
		font-size: 12px;
		font-weight: 800;
	}

	.hero-caption {
		position: absolute;
		left: 14px;
		right: 14px;
		bottom: 12px;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 12px;
		color: #fff;
	}

	.hero-who {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.hero-who strong {
		font-size: 17px;
		font-weight: 800;
	}

	.hero-who span {
		font-size: 13px;
		color: rgb(255 255 255 / 0.75);
	}

	.hero-score {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex: none;
		font-size: 14px;
		font-weight: 700;
		color: #fff;
	}

	.hero-score :global(svg) {
		color: var(--accent);
	}

	/* Mosaik */
	.mosaic {
		columns: 2;
		column-gap: 6px;
	}

	@media (min-width: 721px) {
		.mosaic {
			column-gap: 10px;
		}
	}

	.tile {
		position: relative;
		display: block;
		margin-bottom: 6px;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--photo-bg);
		break-inside: avoid;
	}

	.tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.tag {
		position: absolute;
		left: 8px;
		bottom: 8px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.55);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
	}

	.older {
		align-self: center;
		margin-top: 8px;
		padding: 10px 18px;
		border-radius: 999px;
		background: var(--surface);
		font-size: 14px;
		font-weight: 700;
	}
</style>
