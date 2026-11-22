<script lang="ts">
	import Lightbox from '#lib/components/Lightbox.svelte';
	import PhotoFeed from '#lib/components/PhotoFeed.svelte';
	import { formatDay } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Ein Vollbild über alle Fotos der Seite
	const all = $derived(data.days.flatMap((d) => d.photos));
	const offsets = $derived(
		data.days.map((_, i) => data.days.slice(0, i).reduce((n, d) => n + d.photos.length, 0))
	);
	let index = $state<number | null>(null);

	/** Adresse mit geänderten Filtern (leere Werte fallen weg). */
	function href(
		change: Partial<{ ansicht: string; thema: number | null; person: number | null; bis: string }>
	) {
		const f = data.filter;
		const values = {
			ansicht: f.view === 'alle' ? 'alle' : '',
			thema: f.themeId ?? '',
			person: f.userId ?? '',
			bis: '',
			...change
		};
		const query = Object.entries(values)
			.filter(([, v]) => v !== '' && v !== null)
			.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
			.join('&');
		return `/galerie${query ? `?${query}` : ''}`;
	}

	const filtered = $derived(!!data.filter.themeId || !!data.filter.userId);
	// Thema neben dem Namen nur zeigen, wenn nicht ohnehin nach Thema gefiltert
	const themeHref = $derived(data.filter.themeId ? undefined : (id: number) => href({ thema: id }));

	let form: HTMLFormElement;
</script>

<svelte:head><title>Galerie · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 40px">
	<div class="stack" style="--gap: 20px">
		<div class="stack" style="--gap: 6px">
			<p class="eyebrow">Galerie</p>
			<h1>{data.filter.view === 'sieger' ? 'Die besten Fotos' : 'Alle Fotos'}</h1>
		</div>

		<!-- Filter als normales GET-Formular: funktioniert auch ohne JavaScript -->
		<form class="filters" method="GET" bind:this={form}>
			<div class="segment" role="radiogroup" aria-label="Ansicht">
				<label>
					<input
						type="radio"
						name="ansicht"
						value=""
						checked={data.filter.view === 'sieger'}
						onchange={() => form.requestSubmit()}
					/>
					<span>Sieger</span>
				</label>
				<label>
					<input
						type="radio"
						name="ansicht"
						value="alle"
						checked={data.filter.view === 'alle'}
						onchange={() => form.requestSubmit()}
					/>
					<span>Alle</span>
				</label>
			</div>

			<select
				name="thema"
				aria-label="Thema"
				value={data.filter.themeId ?? ''}
				onchange={() => form.requestSubmit()}
			>
				<option value="">Alle Themen</option>
				{#each data.themes as theme (theme.id)}
					<option value={theme.id}>{theme.title}</option>
				{/each}
			</select>

			<select
				name="person"
				aria-label="Person"
				value={data.filter.userId ?? ''}
				onchange={() => form.requestSubmit()}
			>
				<option value="">Alle Personen</option>
				{#each data.people as person (person.id)}
					<option value={person.id}>{person.name}</option>
				{/each}
			</select>

			<noscript><button class="btn small">Anzeigen</button></noscript>
			{#if filtered}
				<a class="reset muted small" href={href({ thema: null, person: null })}>
					Filter zurücksetzen
				</a>
			{/if}
		</form>
	</div>

	{#if data.days.length === 0}
		<p class="muted">
			{#if filtered}
				Für diese Auswahl gibt es noch keine Fotos.
			{:else if data.filter.view === 'sieger'}
				Hier erscheinen die Tagessieger und Wochenfotos, sobald die ersten Resultate enthüllt sind
				(jeweils um 05:00 Uhr).
			{:else}
				Hier erscheinen die Fotos, sobald die erste Tagesrunde enthüllt ist (jeweils um 05:00 Uhr).
			{/if}
		</p>
	{/if}

	{#each data.days as group, i (group.day)}
		<section class="stack" style="--gap: 20px">
			<h2 class="day">{formatDay(group.day)}</h2>
			<PhotoFeed photos={group.photos} {themeHref} onopen={(j) => (index = offsets[i] + j)} />
		</section>
	{/each}

	{#if data.more}
		<div>
			<a class="btn" href={href({ bis: data.more })}>Ältere Tage</a>
		</div>
	{/if}
</div>

<Lightbox photos={all} bind:index />

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	.filters select {
		width: auto;
		min-width: 160px;
	}

	/* Umschalter Sieger | Alle */
	.segment {
		display: inline-flex;
		padding: 3px;
		border-radius: 999px;
		background: var(--surface);
	}

	.segment input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.segment span {
		display: block;
		padding: 7px 16px;
		border-radius: 999px;
		font-size: 14px;
		color: var(--muted);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}

	.segment input:checked + span {
		color: var(--bg);
		background: var(--text);
	}

	.segment input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.reset {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.day {
		font-size: 15px;
		font-weight: 500;
		color: var(--muted);
		letter-spacing: 0;
	}

	@media (max-width: 720px) {
		.filters select {
			flex: 1 1 140px;
			min-width: 0;
		}
	}
</style>
