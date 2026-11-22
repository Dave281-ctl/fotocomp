<script lang="ts">
	import { enhance } from '$app/forms';
	import { Download, Trash2 } from '@lucide/svelte';
	import { photoSrc } from '#lib/media.ts';
	import { formatShortDay } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const query = (pageNo: number) => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- nur lokal zum Zusammenbauen der URL
		const params = new URLSearchParams();
		if (data.filter.userId) params.set('user', String(data.filter.userId));
		if (data.filter.themeId) params.set('thema', String(data.filter.themeId));
		if (data.filter.day) params.set('tag', data.filter.day);
		params.set('seite', String(pageNo));
		return `?${params}`;
	};
</script>

<svelte:head><title>Fotos · Admin · Fotocomp</title></svelte:head>

<form method="GET" class="filters" data-sveltekit-keepfocus>
	<select name="user" aria-label="Benutzer" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
		<option value="">Alle Benutzer</option>
		{#each data.users as u (u.id)}
			<option value={u.id} selected={u.id === data.filter.userId}>{u.name}</option>
		{/each}
	</select>
	<select name="thema" aria-label="Thema" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
		<option value="">Alle Themen</option>
		{#each data.themes as t (t.id)}
			<option value={t.id} selected={t.id === data.filter.themeId}>{t.title}</option>
		{/each}
	</select>
	<input
		type="date"
		name="tag"
		aria-label="Tag"
		value={data.filter.day ?? ''}
		onchange={(e) => e.currentTarget.form?.requestSubmit()}
	/>
</form>

{#if data.photos.length === 0}
	<p class="muted">Keine Fotos gefunden.</p>
{/if}

<div class="grid">
	{#each data.photos as photo (photo.id)}
		<figure>
			<a href="/foto/{photo.id}"><img src={photoSrc(photo.id, 480)} alt="" loading="lazy" /></a>
			<figcaption>
				<div class="small">{photo.userName}</div>
				<div class="muted small">
					{photo.themeTitle} · {formatShortDay(photo.day)} · {photo.type}
					{(photo.sizeBytes / 1e6).toFixed(1)} MB
				</div>
				<div class="row" style="--gap: 2px">
					<a class="btn ghost small" href={photoSrc(photo.id, 'original')} download>
						<Download size={14} /> Original
					</a>
					<form
						method="POST"
						action="?/delete"
						use:enhance={({ cancel }) => {
							if (!confirm('Foto endgültig löschen?')) cancel();
						}}
					>
						<input type="hidden" name="id" value={photo.id} />
						<button class="btn danger small"><Trash2 size={14} /> Löschen</button>
					</form>
				</div>
			</figcaption>
		</figure>
	{/each}
</div>

<div class="row">
	{#if data.page > 1}<a class="btn small" href={query(data.page - 1)}>Zurück</a>{/if}
	{#if data.hasMore}<a class="btn small" href={query(data.page + 1)}>Weiter</a>{/if}
</div>

<style>
	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 10px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 20px;
	}

	figure {
		margin: 0;
	}

	img {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--photo-bg);
	}

	figcaption {
		padding-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	figcaption .row {
		margin-left: -10px;
	}
</style>
