<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { BellOff, Layers, LifeBuoy, Plus } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { onLive } from '#lib/chat-live.svelte.ts';
	import { formatWhen } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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

	{#if data.chats.length}
		<ul class="list">
			{#each data.chats as c (c.id)}
				<li>
					<a class="chat" href="/chat/{c.id}" class:unread={c.unread > 0}>
						{#if c.kind === 'direct' && c.person}
							<Avatar name={c.person.name} id={c.person.id} size={44} />
						{:else}
							<span class="icon" class:help={c.kind === 'help'}>
								{#if c.kind === 'help'}<LifeBuoy size={20} />{:else}<Layers size={20} />{/if}
							</span>
						{/if}
						<span class="text">
							<span class="top">
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
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">
			Noch keine Chats. Mach bei einem Thema mit – jedes Thema hat einen eigenen Chat – oder schreib
			jemandem direkt über «Neuer Chat».
		</p>
	{/if}
</div>

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

	.list li + li {
		border-top: 1px solid var(--line);
	}

	.chat {
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
