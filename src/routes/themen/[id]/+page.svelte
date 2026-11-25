<script lang="ts">
	import { enhance } from '$app/forms';
	import { ChevronLeft, ChevronRight, CircleCheck, MessageCircle } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Podium from '#lib/components/Podium.svelte';
	import TaskList from '#lib/components/TaskList.svelte';
	import ThemeGallery from '#lib/components/ThemeGallery.svelte';
	import ThemeTabs from '#lib/components/ThemeTabs.svelte';
	import { formatDay } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const theme = $derived(data.theme);
	const open = $derived(data.tasks.filter((t) => !t.done).length);
	const MAX_AVATARS = 8;
</script>

<svelte:head><title>{theme.title} · Fotocomp</title></svelte:head>

<div class="page stack" style="--gap: 32px">
	<div class="stack" style="--gap: 12px">
		<a class="all row muted small" href="/themen"><ChevronLeft size={16} /> Alle Themen</a>
		<ThemeTabs tabs={data.tabs} current={theme.id} />
	</div>

	<header class="stack" style="--gap: 10px">
		<div class="row title">
			<h1>{theme.title}</h1>
			<span class="row links">
				{#if data.chat}
					<a class="chat-link row" href="/chat/{data.chat.id}">
						<MessageCircle size={16} /> Chat
						{#if data.chat.unread}<span class="count">{data.chat.unread}</span>{/if}
					</a>
				{/if}
				<a class="details row muted small" href="/themen/{theme.id}/details">
					Details <ChevronRight size={16} />
				</a>
			</span>
		</div>
		{#if theme.description}<p class="lead">{theme.description}</p>{/if}
		{#if data.members.length}
			<div class="row members">
				<span class="avatars">
					{#each data.members.slice(0, MAX_AVATARS) as m (m.id)}
						<a href="/person/{m.id}" title={m.name}><Avatar name={m.name} id={m.id} size={26} /></a>
					{/each}
				</span>
				<span class="muted small">
					{data.members.length > MAX_AVATARS ? `+${data.members.length - MAX_AVATARS} · ` : ''}
					{data.members.length}
					{data.members.length === 1 ? 'Teilnehmer' : 'Teilnehmende'}
				</span>
			</div>
		{/if}
	</header>

	<!-- Mitmachen bzw. Aufgaben -->
	{#if data.phase.kind === 'ended'}
		<p class="notice">Dieses Thema ist beendet. Die Fotos bleiben hier zu sehen.</p>
	{:else if !data.isMine}
		<form method="POST" action="?/join" class="card join row" use:enhance>
			<span>
				<strong>Mach mit!</strong>
				<span class="muted">
					{data.phase.kind === 'upcoming'
						? `Das Thema startet am ${formatDay(theme.startDate)}.`
						: 'Jeden Tag ein Foto zum Thema, am Abend wird bewertet.'}
				</span>
			</span>
			<button class="btn accent">Mitmachen</button>
		</form>
	{:else if data.tasks.length}
		<section class="stack" style="--gap: 10px">
			<p class="status small" class:all-done={open === 0}>
				{#if open}
					{open} {open === 1 ? 'Aufgabe offen' : 'Aufgaben offen'}
				{:else}
					<CircleCheck size={15} /> Alles erledigt
				{/if}
			</p>
			<TaskList tasks={data.tasks} />
		</section>
	{:else if data.phase.kind === 'upcoming'}
		<p class="notice">Das Thema startet am {formatDay(theme.startDate)}. Du bist dabei!</p>
	{/if}

	<!-- Das Neueste zuerst: Siegertreppchen -->
	{#if data.gallery.highlight}
		{@const h = data.gallery.highlight}
		<section class="stack" style="--gap: 14px">
			<div class="stack" style="--gap: 2px">
				<p class="eyebrow">{h.title}</p>
				<h2>{h.subtitle}</h2>
			</div>
			<Podium photos={h.photos} />
		</section>
	{/if}

	{#if data.gallery.days.length}
		<section class="stack" style="--gap: 16px">
			<h2>{data.gallery.highlight ? 'Weitere Fotos' : 'Alle Fotos'}</h2>
			<ThemeGallery days={data.gallery.days} />
		</section>
	{:else if data.phase.kind !== 'upcoming' && !data.gallery.highlight}
		<p class="muted">
			Noch keine enthüllten Fotos. Die ersten erscheinen nach der ersten Bewertung.
		</p>
	{/if}
</div>

<style>
	.title {
		justify-content: space-between;
		align-items: baseline;
	}

	.all {
		--gap: 2px;
		width: fit-content;
		margin-left: -4px;
	}

	.all:hover {
		color: var(--text);
	}

	.links {
		--gap: 14px;
		flex: none;
	}

	.details {
		--gap: 2px;
	}

	.chat-link {
		--gap: 6px;
		padding: 5px 12px;
		border-radius: 999px;
		background: var(--surface);
		font-size: 14px;
	}

	.chat-link:hover {
		background: var(--surface-2);
	}

	.count {
		min-width: 18px;
		padding: 0 5px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-text);
		font-size: 11px;
		font-weight: 700;
		line-height: 18px;
		text-align: center;
	}

	.details:hover {
		color: var(--text);
	}

	.lead {
		margin: 0;
		font-size: 17px;
		max-width: 640px;
	}

	.members {
		--gap: 10px;
	}

	.avatars {
		display: flex;
	}

	.avatars > a {
		display: flex;
		border-radius: 50%;
		box-shadow: 0 0 0 2px var(--bg);
	}

	.avatars > :global(* + *) {
		margin-left: -3px;
	}

	.join {
		justify-content: space-between;
		flex-wrap: wrap;
	}

	.join > span {
		display: grid;
		gap: 2px;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		font-weight: 600;
		color: var(--accent);
	}

	.status.all-done {
		color: var(--ok);
	}
</style>
