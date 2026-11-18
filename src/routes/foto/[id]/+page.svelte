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

<div class="detail">
	<div class="image">
		<button class="open" onclick={() => (fullscreen = 0)} aria-label="Vollbild">
			<img
				src={photoSrc(photo.id)}
				srcset={photoSrcset(photo.id)}
				sizes="(max-width: 900px) 100vw, 70vw"
				alt=""
			/>
		</button>
		<div class="pager row">
			{#if data.prev}<a class="btn ghost" href="/foto/{data.prev}" aria-label="Vorheriges">
					<ChevronLeft size={20} />
				</a>{/if}
			{#if data.next}<a class="btn ghost" href="/foto/{data.next}" aria-label="Nächstes">
					<ChevronRight size={20} />
				</a>{/if}
		</div>
	</div>

	<aside class="stack" style="--gap: 28px">
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
				<span class="muted small">· {photo.votes} {photo.votes === 1 ? 'Stimme' : 'Stimmen'}</span>
			</p>
		{/if}

		<hr class="divider" />
		<PhotoInfo exif={data.exif} width={data.width} height={data.height} />

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

		<hr class="divider" />
		<section class="stack feedback" style="--gap: 14px">
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
							<button class="btn ghost small" aria-label="Feedback löschen">Löschen</button>
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
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: 40px;
		padding: 24px var(--gutter) 96px;
		max-width: 1600px;
		margin: 0 auto;
	}

	.image {
		position: relative;
	}

	.open {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: var(--photo-bg);
		border-radius: var(--radius);
		overflow: hidden;
		cursor: zoom-in;
	}

	.open img {
		width: 100%;
		max-height: calc(100dvh - 140px);
		object-fit: contain;
	}

	.pager {
		justify-content: space-between;
		margin-top: 8px;
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
			grid-template-columns: 1fr;
			padding-inline: 0;
			gap: 24px;
		}

		.open {
			border-radius: 0;
		}

		aside,
		.pager {
			padding-inline: var(--gutter);
		}
	}
</style>
