<script lang="ts">
	import Lightbox from '#lib/components/Lightbox.svelte';
	import { photoSrc, photoSrcset } from '#lib/media.ts';
	import { addDays, formatShortDay } from '#lib/schedule.ts';
	import { WOW_MIN_STARS } from '#lib/wow.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Ein Vollbild über alle Fotos der Seite, in der angezeigten Reihenfolge
	const all = $derived(data.weeks.flatMap((w) => w.photos));
	let index = $state<number | null>(null);
	const open = (photo: (typeof all)[number]) => (index = all.indexOf(photo));

	const weekLabel = (monday: string) =>
		`${formatShortDay(monday)} – ${formatShortDay(addDays(monday, 6))}`;
</script>

<svelte:head><title>Galerie · Fotocomp</title></svelte:head>

<div class="page wide stack" style="--gap: 48px">
	<header class="stack" style="--gap: 6px">
		<p class="eyebrow">Galerie</p>
		<h1>Die schönsten Fotos</h1>
		<p class="muted small">
			Wochenfotos, Tagessieger und alles ab {WOW_MIN_STARS} Sternen – aus allen Themen.
		</p>
	</header>

	{#each data.weeks as week (week.week)}
		{@const [hero, ...rest] = week.photos}
		<section class="stack" style="--gap: 14px">
			<h2 class="week">{weekLabel(week.week)}</h2>

			<!-- Das schönste Foto der Woche gross -->
			<button class="hero" onclick={() => open(hero)} aria-label="Gross anzeigen">
				<img
					src={photoSrc(hero.id, 1200)}
					srcset={photoSrcset(hero.id)}
					sizes="(max-width: 1200px) 100vw, 1200px"
					alt=""
				/>
				<span class="label">
					{#if hero.badge}<span class="award">
							{hero.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}
						</span>{/if}
					<span>{hero.userName} · {hero.theme?.title}</span>
				</span>
			</button>

			<!-- Mosaik: Hoch- und Querformat gemischt, ohne Beschnitt -->
			{#if rest.length}
				<div class="mosaic">
					{#each rest as photo (photo.id)}
						<button
							class="tile"
							style="aspect-ratio: {photo.width} / {photo.height}"
							onclick={() => open(photo)}
							aria-label="Gross anzeigen"
						>
							<img src={photoSrc(photo.id, 1200)} alt="" loading="lazy" />
							<span class="label">
								{#if photo.badge}<span class="award">
										{photo.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}
									</span>{/if}
								<span>{photo.userName} · {photo.theme?.title}</span>
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</section>
	{:else}
		<p class="muted">
			Noch keine Fotos in der Galerie. Hier erscheinen die Sieger und die besten Fotos, sobald die
			ersten Bewertungen enthüllt sind.
		</p>
	{/each}

	{#if data.more}
		<div class="more"><a class="btn" href="?bis={data.more}">Ältere Wochen</a></div>
	{/if}
</div>
<Lightbox photos={all} bind:index />

<style>
	.week {
		margin: 0;
		font-size: 15px;
		font-weight: 500;
		color: var(--muted);
	}

	button {
		position: relative;
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: var(--photo-bg);
		cursor: zoom-in;
		overflow: hidden;
	}

	.hero {
		border-radius: var(--radius);
	}

	/* Das Titelbild immer ganz zeigen, auch im Hochformat */
	.hero img {
		display: block;
		width: 100%;
		max-height: 80vh;
		object-fit: contain;
	}

	.mosaic {
		columns: 3 260px;
		column-gap: 10px;
	}

	@media (max-width: 600px) {
		.mosaic {
			columns: 2;
			column-gap: 6px;
		}

		.tile {
			margin-bottom: 6px;
		}
	}

	.tile {
		margin-bottom: 10px;
		border-radius: var(--radius-sm);
		break-inside: avoid;
	}

	.tile img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.4s;
	}

	.tile:hover img {
		transform: scale(1.03);
	}

	/* Name und Thema dezent, erst beim Darüberfahren deutlich */
	.label {
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
		padding: 28px 14px 12px;
		font-size: 13px;
		color: #fff;
		text-align: left;
		background: linear-gradient(to top, rgb(0 0 0 / 0.6), transparent);
		opacity: 0;
		transition: opacity 0.25s;
	}

	.hero .label {
		opacity: 1;
		font-size: 14px;
	}

	button:hover .label,
	button:focus-visible .label {
		opacity: 1;
	}

	.award {
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-text);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.more {
		text-align: center;
	}
</style>
