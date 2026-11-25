<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { BellOff, Ellipsis, Layers, LifeBuoy, Pin, PinOff, Plus, Trash2 } from '@lucide/svelte';
	import { swipe } from '#lib/swipe.ts';
	import type { ChatSummary } from '#lib/types.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import { onLive } from '#lib/chat-live.svelte.ts';
	import { formatWhen } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Wischen nach links öffnet die Knöpfe einer Zeile; am Computer das ⋯-Menü
	const ACTIONS_W = 150;
	let openRow = $state<number | null>(null);
	let drag = $state<{ id: number; dx: number } | null>(null);
	let menuRow = $state<number | null>(null);
	let confirmDelete = $state<ChatSummary | null>(null);
	let notice = $state('');

	const offset = (id: number) =>
		drag?.id === id
			? Math.min(0, drag.dx + (openRow === id ? -ACTIONS_W : 0))
			: openRow === id
				? -ACTIONS_W
				: 0;

	async function favorite(c: ChatSummary) {
		openRow = menuRow = null;
		notice = '';
		const res = await fetch(`/api/chat/${c.id}/favorit`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ on: !c.favorite })
		});
		if (!res.ok) notice = (await res.json().catch(() => ({}))).error ?? 'Das hat nicht geklappt.';
		await invalidateAll();
	}

	async function clearChat(c: ChatSummary) {
		confirmDelete = null;
		await fetch(`/api/chat/${c.id}/leeren`, { method: 'POST' });
		await invalidateAll();
	}

	// Neue Nachrichten: Liste aktualisieren
	onMount(() =>
		onLive((e) => {
			if (e.type === 'message' || e.type === 'reconnected') void invalidateAll();
		})
	);
</script>

<svelte:head><title>Chat · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 24px">
	<div class="row head">
		<div class="stack" style="--gap: 6px">
			<p class="eyebrow">Chat</p>
			<h1>Nachrichten</h1>
		</div>
		<a class="btn" href="/chat/neu"><Plus size={16} /> Neuer Chat</a>
	</div>

	{#if notice}<p class="notice">{notice}</p>{/if}

	{#if data.chats.length}
		<ul class="list">
			{#each data.chats as c (c.id)}
				<li class:menu-open={menuRow === c.id}>
					<!-- Knöpfe hinter der Zeile (sichtbar nach dem Wischen) -->
					<div class="actions" aria-hidden={openRow !== c.id}>
						<button class="fav" onclick={() => favorite(c)}>
							{#if c.favorite}<PinOff size={18} /> Lösen{:else}<Pin size={18} /> Anheften{/if}
						</button>
						{#if c.kind === 'direct'}
							<button class="del" onclick={() => ((confirmDelete = c), (openRow = null))}>
								<Trash2 size={18} /> Löschen
							</button>
						{/if}
					</div>
					<a
						class="chat"
						href="/chat/{c.id}"
						class:unread={c.unread > 0}
						style:transform={offset(c.id) ? `translateX(${offset(c.id)}px)` : undefined}
						style:transition={drag?.id === c.id ? 'none' : undefined}
						onclick={(e) => {
							// Offene Zeile: erst schliessen statt öffnen
							if (openRow !== null) {
								e.preventDefault();
								openRow = null;
							}
						}}
						use:swipe={{
							onleft: () => (openRow = c.id),
							onright: openRow === c.id ? () => (openRow = null) : undefined,
							onmove: (dx) => (drag = dx ? { id: c.id, dx } : null),
							max: ACTIONS_W,
							threshold: 50
						}}
					>
						{#if c.kind === 'direct' && c.person}
							<Avatar name={c.person.name} id={c.person.id} size={44} />
						{:else}
							<span class="icon" class:help={c.kind === 'help'}>
								{#if c.kind === 'help'}<LifeBuoy size={20} />{:else}<Layers size={20} />{/if}
							</span>
						{/if}
						<span class="text">
							<span class="top">
								{#if c.favorite}<Pin size={13} class="pinned" />{/if}
								<strong>{c.title}</strong>
								{#if c.last}<span class="when">{formatWhen(c.last.at, new Date())}</span>{/if}
							</span>
							<span class="bottom">
								<span class="excerpt">
									{#if c.last}
										{c.last.own ? 'Du' : c.kind === 'direct' ? '' : c.last.author}{c.last.own ||
										c.kind !== 'direct'
											? ': '
											: ''}{c.last.excerpt}
									{:else}
										<span class="muted">Noch keine Nachrichten</span>
									{/if}
								</span>
								{#if c.muted}<BellOff size={14} class="muted" />{/if}
								{#if c.mentioned}<span class="at" title="Du wurdest erwähnt">@</span>{/if}
								{#if c.unread}<span class="count">{c.unread}</span>{/if}
							</span>
						</span>
					</a>
					<!-- Computer: ⋯-Menü -->
					<button
						class="more"
						onclick={() => (menuRow = menuRow === c.id ? null : c.id)}
						aria-label="Optionen für {c.title}"
					>
						<Ellipsis size={18} />
					</button>
					{#if menuRow === c.id}
						<div class="popover">
							<button onclick={() => favorite(c)}>
								{#if c.favorite}<PinOff size={16} /> Lösen{:else}<Pin size={16} /> Oben anheften{/if}
							</button>
							{#if c.kind === 'direct'}
								<button class="danger" onclick={() => ((confirmDelete = c), (menuRow = null))}>
									<Trash2 size={16} /> Chat löschen
								</button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="muted small tip">
			Tipp: Auf dem Handy eine Zeile nach links wischen, um sie anzuheften oder zu löschen. Bis zu 3
			Chats bleiben oben.
		</p>
	{:else}
		<p class="muted">
			Noch keine Chats. Mach bei einem Thema mit – jedes Thema hat einen eigenen Chat – oder schreib
			jemandem direkt über «Neuer Chat».
		</p>
	{/if}
</div>

{#if confirmDelete}
	{@const c = confirmDelete}
	<div class="backdrop" role="presentation" onclick={() => (confirmDelete = null)}></div>
	<div class="dialog card" role="dialog" aria-label="Chat löschen">
		<strong>Chat mit {c.title} löschen?</strong>
		<p class="muted">
			Der Chat wird nur für dich gelöscht. {c.title} sieht ihn weiterhin. Schreibt {c.title} dir wieder,
			erscheint der Chat neu – mit den neuen Nachrichten.
		</p>
		<div class="row" style="--gap: 8px; justify-content: flex-end">
			<button class="btn ghost" onclick={() => (confirmDelete = null)}>Abbrechen</button>
			<button class="btn danger" onclick={() => clearChat(c)}>Für mich löschen</button>
		</div>
	</div>
{/if}

<style>
	.head {
		justify-content: space-between;
		align-items: flex-end;
	}

	.list {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
		border-radius: var(--radius);
		background: var(--surface);
		overflow: hidden;
	}

	.list li {
		position: relative;
		overflow: hidden;
	}

	.list li.menu-open {
		overflow: visible;
		z-index: 2;
	}

	.list li + li {
		border-top: 1px solid var(--line);
	}

	.actions {
		position: absolute;
		inset: 0 0 0 auto;
		display: flex;
		width: 150px;
	}

	.actions button {
		flex: 1;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 4px;
		border: 0;
		color: #fff;
		font: inherit;
		font-size: 12px;
		cursor: pointer;
	}

	.actions .fav {
		background: color-mix(in srgb, var(--accent) 75%, #000);
	}

	.actions .del {
		background: var(--danger);
	}

	.more {
		position: absolute;
		top: 50%;
		right: 8px;
		transform: translateY(-50%);
		display: grid;
		padding: 6px;
		border: 0;
		border-radius: 50%;
		background: var(--surface-2);
		color: var(--muted);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
	}

	li:hover .more,
	.more:focus-visible,
	.menu-open .more {
		opacity: 1;
	}

	@media (hover: none) {
		.more {
			display: none;
		}
	}

	@media (hover: hover) {
		.chat {
			padding-right: 50px;
		}
	}

	.popover {
		position: absolute;
		right: 8px;
		top: calc(50% + 18px);
		z-index: 5;
		display: grid;
		min-width: 190px;
		padding: 6px;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
	}

	.popover button {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 10px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.popover button:hover {
		background: var(--surface);
	}

	.popover .danger {
		color: var(--danger);
	}

	.top :global(.pinned) {
		flex: none;
		color: var(--accent);
	}

	.tip {
		margin: 0;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgb(0 0 0 / 0.45);
	}

	.dialog {
		position: fixed;
		z-index: 41;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		display: grid;
		gap: 10px;
		width: min(92vw, 380px);
		padding: 20px;
		box-shadow: 0 16px 50px rgb(0 0 0 / 0.5);
	}

	.dialog p {
		margin: 0;
	}

	.chat {
		position: relative;
		z-index: 1;
		background: var(--surface);
		display: grid;
		grid-template-columns: 44px 1fr;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		transition: background 0.15s;
	}

	.chat:hover {
		background: var(--surface-2);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--accent) 16%, var(--surface-2));
		color: var(--accent);
	}

	.icon.help {
		background: color-mix(in srgb, var(--ok) 16%, var(--surface-2));
		color: var(--ok);
	}

	.text {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.top,
	.bottom {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.top strong {
		flex: 1;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.when {
		flex: none;
		font-size: 12px;
		color: var(--muted);
	}

	.unread .when {
		color: var(--accent);
	}

	.excerpt {
		flex: 1;
		font-size: 14px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.unread .excerpt {
		color: var(--text);
	}

	.at,
	.count {
		flex: none;
		display: grid;
		place-items: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-text);
		font-size: 11px;
		font-weight: 700;
	}
</style>
