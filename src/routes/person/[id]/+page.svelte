<script lang="ts">
	import { Camera, MessageCircle, Trophy } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Lightbox from '#lib/components/Lightbox.svelte';
	import { formatAperture, formatFocal } from '#lib/exif-format.ts';
	import { photoSrc, photoSrcset } from '#lib/media.ts';
	import { formatShortDay } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Ein Vollbild über alle Fotos der Seite: erst die Highlights, dann der Rest
	const all = $derived([...data.highlights, ...data.rest]);
	let index = $state<number | null>(null);
	const open = (photo: (typeof all)[number]) => (index = all.indexOf(photo));

	const since = $derived(
		new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' }).format(data.person.since)
	);
	const maxCamera = $derived(data.cameras.cameras[0]?.photos ?? 1);
	const favourite = $derived(
		[
			data.cameras.lens,
			data.cameras.focalLength && formatFocal(data.cameras.focalLength),
			data.cameras.aperture && formatAperture(data.cameras.aperture)
		].filter(Boolean)
	);
	const [hero, ...more] = $derived(data.highlights);
</script>

<svelte:head><title>{data.person.name} · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 40px">
	<header class="row head">
		<Avatar name={data.person.name} id={data.person.id} size={64} />
		<div class="stack" style="--gap: 4px">
			<h1>
				{data.person.name}{#if data.isMe}<span class="muted me"> (du)</span>{/if}
			</h1>
			{#if !data.isMe}
				<a class="btn small write" href="/chat/mit/{data.person.id}">
					<MessageCircle size={15} /> Nachricht schreiben
				</a>
			{/if}
			<p class="muted small">
				dabei seit {since}
				{#if data.themes.length}
					·
					{#each data.themes as t, i (t.id)}{i ? ', ' : ''}<a href="/themen/{t.id}">
							{t.title}
						</a>{/each}
				{/if}
			</p>
		</div>
	</header>

	<div class="stats">
		<div>
			<strong>{data.stats.photos}</strong><span>{data.stats.photos === 1 ? 'Foto' : 'Fotos'}</span>
		</div>
		<div>
			<strong>{data.stats.dayWins}</strong><span>
				{data.stats.dayWins === 1 ? 'Tagessieg' : 'Tagessiege'}
			</span>
		</div>
		<div>
			<strong>{data.stats.weekWins}</strong><span>
				{data.stats.weekWins === 1 ? 'Wochenfoto' : 'Wochenfotos'}
			</span>
		</div>
	</div>

	{#if data.cameras.cameras.length}
		<section class="stack" style="--gap: 14px">
			<h2 class="row" style="--gap: 8px"><Camera size={18} /> Kameras</h2>
			<ul class="cameras">
				{#each data.cameras.cameras.slice(0, 5) as c (c.name)}
					<li>
						<span class="name">{c.name}</span>
						<span class="bar"><span style="width: {(c.photos / maxCamera) * 100}%"></span></span>
						<span class="muted small count">{c.photos}</span>
					</li>
				{/each}
			</ul>
			{#if favourite.length}
				<p class="muted small">Meistgenutzt: {favourite.join(' · ')}</p>
			{/if}
		</section>
	{/if}

	{#if hero}
		<section class="stack" style="--gap: 14px">
			<h2 class="row" style="--gap: 8px"><Trophy size={18} /> Highlights</h2>
			<button class="hero" onclick={() => open(hero)} aria-label="Gross anzeigen">
				<img
					src={photoSrc(hero.id, 1200)}
					srcset={photoSrcset(hero.id)}
					sizes="(max-width: 1100px) 100vw, 1100px"
					alt=""
				/>
				<span class="label">
					{#if hero.badge}<span class="award">
							{hero.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}
						</span>{/if}
					<span>{hero.theme.title} · {formatShortDay(hero.day)}</span>
				</span>
			</button>
			{#if more.length}
				<div class="mosaic">
					{#each more as photo (photo.id)}
						<button
							class="tile"
							style="aspect-ratio: {photo.width} / {photo.height}"
							onclick={() => open(photo)}
							aria-label="Gross anzeigen"
						>
							<img src={photoSrc(photo.id, 1200)} alt="" loading="lazy" />
							{#if photo.badge}
								<span class="dot-award" title={photo.badge === 'week' ? 'Wochenfoto' : 'Tagessieg'}>
									<Trophy size={12} />
								</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	{#if data.rest.length}
		<section class="stack" style="--gap: 14px">
			<h2>{hero ? 'Alle weiteren Fotos' : 'Alle Fotos'}</h2>
			<div class="grid">
				{#each data.rest as photo (photo.id)}
					<button class="square" onclick={() => open(photo)} aria-label="Gross anzeigen">
						<img src={photoSrc(photo.id, 480)} alt="" loading="lazy" />
						<span class="caption">{formatShortDay(photo.day)} · {photo.theme.title}</span>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#if !data.stats.photos}
		<p class="muted">
			{data.isMe ? 'Du hast' : `${data.person.name} hat`} noch keine enthüllten Fotos. Neue Fotos erscheinen
			hier am Morgen nach der Bewertung.
		</p>
	{/if}
</div>
<Lightbox photos={all} bind:index />

<style>
	.head {
		--gap: 18px;
	}

	h1 {
		margin: 0;
	}

	.write {
		order: 3;
		width: fit-content;
		margin-top: 6px;
	}

	.me {
		font-weight: 400;
	}

	.head p {
		margin: 0;
	}

	.head a:hover {
		color: var(--text);
		text-decoration: underline;
	}

	h2 {
		margin: 0;
		font-size: 18px;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		max-width: 560px;
	}

	.stats div {
		display: grid;
		gap: 2px;
		padding: 14px 16px;
		border-radius: var(--radius-sm);
		background: var(--surface);
	}

	.stats strong {
		font-size: 24px;
		font-weight: 600;
	}

	.stats span {
		font-size: 13px;
		color: var(--muted);
	}

	.cameras {
		display: grid;
		gap: 10px;
		max-width: 560px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.cameras li {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(60px, 1fr) 28px;
		align-items: center;
		gap: 12px;
	}

	.cameras .name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bar {
		height: 8px;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--accent);
	}

	.count {
		text-align: right;
	}

	section p {
		margin: 0;
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

	.hero img {
		display: block;
		width: 100%;
		max-height: 75vh;
		object-fit: contain;
	}

	.label {
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
		padding: 28px 14px 12px;
		font-size: 14px;
		color: #fff;
		text-align: left;
		background: linear-gradient(to top, rgb(0 0 0 / 0.6), transparent);
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

	.mosaic {
		columns: 3 220px;
		column-gap: 8px;
	}

	@media (max-width: 600px) {
		.mosaic {
			columns: 2;
			column-gap: 6px;
		}
	}

	.tile {
		margin-bottom: 8px;
		border-radius: var(--radius-sm);
		break-inside: avoid;
	}

	.tile img,
	.square img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s;
	}

	.tile:hover img,
	.square:hover img {
		transform: scale(1.03);
	}

	.dot-award {
		position: absolute;
		top: 8px;
		left: 8px;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.55);
		color: var(--accent);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 6px;
	}

	@media (max-width: 480px) {
		.grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 4px;
		}
	}

	.square {
		border-radius: 6px;
		aspect-ratio: 1;
	}

	.caption {
		position: absolute;
		inset: auto 0 0 0;
		padding: 16px 8px 6px;
		font-size: 11px;
		color: #fff;
		text-align: left;
		background: linear-gradient(to top, rgb(0 0 0 / 0.6), transparent);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.square:hover .caption {
		opacity: 1;
	}
</style>
