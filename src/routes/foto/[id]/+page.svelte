<script lang="ts">
	import { enhance } from '$app/forms';
	import { ChevronLeft, ChevronRight, Download, Maximize } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Lightbox from '#lib/components/Lightbox.svelte';
	import PhotoInfo from '#lib/components/PhotoInfo.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import { photoSrc, photoSrcset } from '#lib/media.ts';
	import { formatDay } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let photo = $derived(data.photo!);
	let fullscreen = $state<number | null>(null);

	// Infos daneben oder darunter – je nachdem, wo das Bild grösser wird.
	const SIDEBAR = 340 + 40; // Infospalte + Abstand
	const CHROME = 140; // Kopfzeile, Abstände, Blätter-Knöpfe
	const ratio = $derived(data.width / data.height);
	let innerWidth = $state<number>();
	let innerHeight = $state<number>();
	const layout = $derived.by((): 'side' | 'below' => {
		// Vor dem ersten Messen (Server): Querformat darunter, Hochformat daneben
		if (!innerWidth || !innerHeight) return ratio > 1.2 ? 'below' : 'side';
		if (innerWidth <= 900) return 'below';
		const width = Math.min(innerWidth, 1600) - 2 * 32;
		const maxHeight = innerHeight - CHROME;
		const side = Math.min(width - SIDEBAR, maxHeight * ratio);
		const below = Math.min(width, maxHeight * ratio);
		// Darunter nur, wenn das Bild dadurch spürbar grösser wird (≈ 15 % mehr Fläche)
		return below * below > 1.15 * side * side ? 'below' : 'side';
	});

	async function rate(stars: number) {
		const previous = photo.myStars;
		photo = { ...photo, myStars: stars };
		const res = await fetch('/api/vote', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ photoId: photo.id, stars })
		});
		if (!res.ok) photo = { ...photo, myStars: previous };
	}
</script>

<svelte:head><title>Foto · Fotocomp</title></svelte:head>
<svelte:window bind:innerWidth bind:innerHeight />

<div class="detail {layout}" style="--ratio: {ratio}">
	<div class="image">
		<button class="open" onclick={() => (fullscreen = 0)} aria-label="Vollbild">
			<img
				src={photoSrc(photo.id)}
				srcset={photoSrcset(photo.id)}
				width={data.width}
				height={data.height}
				sizes={layout === 'below' ? '100vw' : '70vw'}
				alt=""
			/>
		</button>
		<div class="pager row">
			{#if data.prev}<a class="btn ghost icon" href="/foto/{data.prev}" aria-label="Vorheriges">
					<ChevronLeft size={20} />
				</a>{/if}
			{#if data.next}<a class="btn ghost icon" href="/foto/{data.next}" aria-label="Nächstes">
					<ChevronRight size={20} />
				</a>{/if}
		</div>
	</div>

	<aside>
		<section class="panel stack" style="--gap: 24px">
			<div class="stack" style="--gap: 6px">
				<a class="eyebrow" href="/galerie?thema={data.theme.id}">{data.theme.title}</a>
				<p class="muted small">{formatDay(data.day)}</p>
			</div>

			{#if photo.userName}
				<div class="row" style="--gap: 12px">
					<Avatar name={photo.userName} id={photo.userId} size={36} />
					<div>
						<div class="name">{photo.userName}</div>
						{#if photo.rank}<div class="muted small">
								{photo.rank === 1 ? 'Tagessieg' : `${photo.rank}. Platz`}
							</div>{/if}
					</div>
				</div>
			{:else}
				<p class="muted">Der Name wird um 05:00 Uhr enthüllt.</p>
			{/if}

			{#if data.canVote}
				<div class="stack" style="--gap: 6px">
					<span class="muted small">Deine Bewertung</span>
					<Stars value={photo.myStars} size={26} onrate={rate} />
				</div>
			{:else if data.revealed && photo.votes}
				<p>
					<span class="score">★ {photo.average?.toFixed(1)}</span>
					<span class="muted small">
						· {photo.votes}
						{photo.votes === 1 ? 'Stimme' : 'Stimmen'}
					</span>
				</p>
			{/if}

			<div class="row" style="--gap: 8px">
				<button class="btn small" onclick={() => (fullscreen = 0)}>
					<Maximize size={16} /> Vollbild
				</button>
				{#if data.canDownload}
					<a class="btn small" href={photoSrc(photo.id, 'original')} download>
						<Download size={16} /> Original
					</a>
				{/if}
			</div>
		</section>

		<section class="panel">
			<PhotoInfo
				exif={data.exif}
				width={data.width}
				height={data.height}
				original={data.original}
			/>
		</section>

		<section class="panel stack feedback" style="--gap: 14px">
			<h2>Feedback</h2>
			{#if data.isOwn}
				<form method="POST" action="?/feedbackWanted" use:enhance>
					<input type="hidden" name="wanted" value={String(!data.feedbackWanted)} />
					<label class="check">
						<input
							type="checkbox"
							checked={data.feedbackWanted}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
						Feedback zu diesem Foto willkommen
					</label>
				</form>
			{/if}

			{#each data.feedback as item (item.id)}
				<article class="note">
					<div class="row" style="justify-content: space-between">
						<span class="small"><strong>{item.authorName}</strong></span>
						<form method="POST" action="?/deleteFeedback" use:enhance>
							<input type="hidden" name="id" value={item.id} />
							<button class="btn danger small" aria-label="Feedback löschen">Löschen</button>
						</form>
					</div>
					<p>{item.body}</p>
				</article>
			{:else}
				{#if data.isOwn}
					<p class="muted small">Noch kein Feedback erhalten.</p>
				{/if}
			{/each}

			{#if data.canGiveFeedback}
				<form method="POST" action="?/feedback" class="stack" style="--gap: 10px" use:enhance>
					<textarea
						name="body"
						rows="3"
						placeholder="Was gefällt dir? Was könnte man ausprobieren?"
						required></textarea>
					{#if form?.feedbackError}<p class="error">{form.feedbackError}</p>{/if}
					<div class="row" style="justify-content: space-between">
						<span class="muted small">
							Nur {photo.userName ?? 'der Fotograf'} sieht dein Feedback.
						</span>
						<button class="btn small primary">Senden</button>
					</div>
				</form>
			{:else if !data.isOwn}
				<p class="muted small">Zu diesem Foto ist kein Feedback gewünscht.</p>
			{/if}
		</section>
	</aside>
</div>

<Lightbox photos={[photo]} bind:index={fullscreen} />

<style>
	.detail {
		display: grid;
		gap: 40px;
		padding: 24px var(--gutter) 96px;
		max-width: 1600px;
		margin: 0 auto;
	}

	/* Infos rechts neben dem Bild */
	.detail.side {
		grid-template-columns: minmax(0, 1fr) 340px;
	}

	.side aside {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.side .panel + .panel {
		padding-top: 28px;
		border-top: 1px solid var(--line);
	}

	/* Infos unter dem Bild, in Spalten nebeneinander */
	.below aside {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 32px 48px;
		align-items: start;
	}

	.image {
		position: relative;
		min-width: 0;
	}

	/* Der Rahmen hat genau das Format des Fotos: keine schwarzen Ränder.
	   Breite: so gross wie möglich, ohne höher als der Bildschirm zu werden. */
	.open {
		display: block;
		width: min(100%, calc((100dvh - 140px) * var(--ratio)));
		margin: 0 auto;
		padding: 0;
		border: 0;
		background: var(--photo-bg);
		border-radius: var(--radius);
		overflow: hidden;
		cursor: zoom-in;
	}

	.open img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--ratio);
	}

	.pager {
		justify-content: space-between;
		width: min(100%, calc((100dvh - 140px) * var(--ratio)));
		margin: 8px auto 0;
	}

	.pager a:only-child[aria-label='Nächstes'] {
		margin-left: auto;
	}

	.note {
		background: var(--surface);
		border-radius: var(--radius-sm);
		padding: 12px 14px;
		font-size: 15px;
		white-space: pre-line;
	}

	.name {
		font-weight: 500;
	}

	.score {
		font-size: 22px;
		font-weight: 600;
		color: var(--accent);
	}

	@media (max-width: 900px) {
		.detail {
			padding-inline: 0;
			gap: 24px;
		}

		.open,
		.pager {
			width: 100%;
		}

		.open {
			border-radius: 0;
		}

		.below aside {
			grid-template-columns: 1fr;
		}

		aside,
		.pager {
			padding-inline: var(--gutter);
		}
	}
</style>
