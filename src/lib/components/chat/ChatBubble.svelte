<script lang="ts">
	import { page } from '$app/state';
	import { ChevronDown, Image } from '@lucide/svelte';
	import { segments } from '../../chat-rules.ts';
	import { photoSrc } from '../../media.ts';
	import { formatTime } from '../../schedule.ts';
	import type { ChatMessage } from '../../types.ts';

	/**
	 * Eine Nachricht: Sprechblase mit Zitat, Text (Erwähnungen, Links, Fotos),
	 * Zeit und Reaktionen. Lange drücken oder ⌄ öffnet das Menü, nach rechts
	 * wischen zitiert.
	 */
	let {
		message,
		own,
		showName,
		meId,
		onmenu,
		onreply,
		onquote
	}: {
		message: ChatMessage;
		own: boolean;
		showName: boolean;
		meId: number;
		onmenu: (message: ChatMessage) => void;
		onreply: (message: ChatMessage) => void;
		onquote: (id: number) => void;
	} = $props();

	const parts = $derived(segments(message.body, message.mentions, page.url.origin));
	let whoOpen = $state<string | null>(null);

	// Lange drücken (Handy) öffnet das Menü; nach rechts wischen zitiert
	let pressTimer: ReturnType<typeof setTimeout> | undefined;
	let startX = 0;
	let startY = 0;
	let dx = $state(0);
	let swiping = false;

	function touchStart(e: TouchEvent) {
		if (message.deleted) return;
		startX = e.touches[0].clientX;
		startY = e.touches[0].clientY;
		swiping = false;
		pressTimer = setTimeout(() => onmenu(message), 450);
	}

	function touchMove(e: TouchEvent) {
		const x = e.touches[0].clientX - startX;
		const y = Math.abs(e.touches[0].clientY - startY);
		if (Math.abs(x) > 8 || y > 8) clearTimeout(pressTimer);
		if (!swiping && x > 12 && y < 20) swiping = true;
		if (swiping) dx = Math.max(0, Math.min(72, x));
	}

	function touchEnd() {
		clearTimeout(pressTimer);
		if (swiping && dx > 56) onreply(message);
		dx = 0;
		swiping = false;
	}
</script>

<div id="m-{message.id}" class="msg" class:own>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bubble"
		class:deleted={message.deleted}
		style:transform={dx ? `translateX(${dx}px)` : undefined}
		ontouchstart={touchStart}
		ontouchmove={touchMove}
		ontouchend={touchEnd}
		ontouchcancel={touchEnd}
		oncontextmenu={(e) => {
			if (!message.deleted) {
				e.preventDefault();
				onmenu(message);
			}
		}}
	>
		{#if showName && !own}
			<a
				class="name"
				href="/person/{message.author.id}"
				style="--hue: {(message.author.id * 47) % 360}"
			>
				{message.author.name}
				{#if message.author.isAdmin}<span class="admin">Admin</span>{/if}
			</a>
		{/if}

		{#if message.replyTo}
			<button class="quote" onclick={() => onquote(message.replyTo!.id)}>
				{#if 'missing' in message.replyTo}
					<em>Nachricht nicht mehr verfügbar</em>
				{:else}
					<strong>{message.replyTo.authorName}</strong>
					<span>{message.replyTo.excerpt}</span>
				{/if}
			</button>
		{/if}

		{#if message.deleted}
			<p class="body"><em>Nachricht gelöscht</em></p>
		{:else}
			<p class="body">
				{#each parts as part, i (i)}
					{#if part.type === 'text'}{part.text}{:else if part.type === 'mention'}<a
							class="mention"
							class:me={part.userId === meId}
							href="/person/{part.userId}"
						>
							{part.text}
						</a>{:else if part.type === 'link'}<a
							class="link"
							href={part.href}
							target="_blank"
							rel="noopener noreferrer nofollow"
						>
							{part.text}
						</a>{:else}<a class="photo" href="/foto/{part.photoId}">
							<img src={photoSrc(part.photoId, 480)} alt="" loading="lazy" /><span>
								<Image size={14} /> Foto ansehen
							</span>
						</a>{/if}
				{/each}
			</p>
		{/if}

		<span class="time">{formatTime(message.createdAt)}</span>

		{#if !message.deleted}
			<button class="more" onclick={() => onmenu(message)} aria-label="Optionen">
				<ChevronDown size={16} />
			</button>
		{/if}
	</div>

	{#if message.reactions.length}
		<div class="reactions">
			{#each message.reactions as r (r.emoji)}
				<button
					class:mine={r.users.some((u) => u.id === meId)}
					onclick={() => (whoOpen = whoOpen === r.emoji ? null : r.emoji)}
					title={r.users.map((u) => u.name).join(', ')}
				>
					{r.emoji}
					{#if r.users.length > 1}<span>{r.users.length}</span>{/if}
				</button>
			{/each}
		</div>
		{#if whoOpen}
			{@const r = message.reactions.find((x) => x.emoji === whoOpen)}
			{#if r}<p class="who">{r.emoji} {r.users.map((u) => u.name).join(', ')}</p>{/if}
		{/if}
	{/if}
</div>

<style>
	.msg {
		display: grid;
		justify-items: start;
		gap: 2px;
		max-width: min(78%, 560px);
	}

	.msg.own {
		justify-items: end;
		margin-left: auto;
	}

	.bubble {
		position: relative;
		display: grid;
		gap: 4px;
		min-width: 64px;
		padding: 7px 12px 6px;
		border-radius: 16px 16px 16px 4px;
		background: var(--surface);
		transition: transform 0.15s;
		-webkit-touch-callout: none;
		user-select: text;
	}

	.own .bubble {
		border-radius: 16px 16px 4px 16px;
		background: color-mix(in srgb, var(--accent) 24%, var(--surface));
	}

	.name {
		font-size: 13px;
		font-weight: 600;
		color: hsl(var(--hue) 55% 68%);
	}

	:global([data-theme='light']) .name {
		color: hsl(var(--hue) 45% 38%);
	}

	.admin {
		margin-left: 4px;
		padding: 0 6px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--ok) 20%, transparent);
		color: var(--ok);
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.quote {
		display: grid;
		gap: 1px;
		padding: 5px 9px;
		border: 0;
		border-left: 3px solid var(--accent);
		border-radius: 6px;
		background: rgb(0 0 0 / 0.18);
		color: inherit;
		font: inherit;
		font-size: 13px;
		text-align: left;
		cursor: pointer;
	}

	:global([data-theme='light']) .quote {
		background: rgb(0 0 0 / 0.05);
	}

	.quote strong {
		color: var(--accent);
		font-weight: 600;
	}

	.quote span,
	.quote em {
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.body {
		margin: 0;
		padding-right: 38px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.4;
	}

	.deleted .body {
		color: var(--muted);
	}

	.mention {
		color: var(--accent);
		font-weight: 600;
	}

	.mention.me {
		padding: 0 3px;
		border-radius: 4px;
		background: color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.link {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.photo {
		display: grid;
		margin: 4px 0;
		border-radius: 10px;
		overflow: hidden;
		background: var(--photo-bg);
		max-width: 240px;
	}

	.photo img {
		width: 100%;
		max-height: 220px;
		object-fit: cover;
	}

	.photo span {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		font-size: 13px;
		color: var(--accent);
	}

	.time {
		position: absolute;
		right: 10px;
		bottom: 5px;
		font-size: 11px;
		color: var(--muted);
	}

	.more {
		position: absolute;
		top: 4px;
		right: 4px;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: inherit;
		color: var(--muted);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.bubble:hover .more,
	.more:focus-visible {
		opacity: 1;
	}

	@media (hover: none) {
		.more {
			display: none;
		}
	}

	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: -6px;
		padding: 0 6px;
	}

	.reactions button {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 1px 7px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}

	.reactions button.mine {
		border-color: color-mix(in srgb, var(--accent) 60%, transparent);
	}

	.reactions span {
		font-size: 11px;
		color: var(--muted);
	}

	.who {
		margin: 0;
		padding: 0 8px;
		font-size: 12px;
		color: var(--muted);
	}
</style>
