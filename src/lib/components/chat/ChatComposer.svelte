<script lang="ts">
	import { onMount } from 'svelte';
	import { SendHorizontal, X } from '@lucide/svelte';
	import { MAX_MESSAGE_LENGTH, chatExcerpt } from '../../chat-rules.ts';
	import type { ChatMessage } from '../../types.ts';
	import Avatar from '../Avatar.svelte';

	/** Eingabe: wächst mit, Enter sendet (am Computer), @ schlägt Mitglieder vor. */
	let {
		people,
		meId,
		replyTo = $bindable(),
		onsend
	}: {
		people: { id: number; name: string }[];
		meId: number;
		replyTo: ChatMessage | null;
		onsend: (input: { body: string; mentionIds: number[] }) => Promise<boolean>;
	} = $props();

	let text = $state('');
	let field: HTMLTextAreaElement;
	let sending = $state(false);
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- nur für das Senden, nicht angezeigt
	let mentionIds = new Set<number>();
	let coarse = false;
	onMount(() => (coarse = matchMedia('(pointer: coarse)').matches));

	// @-Vorschläge: Text direkt vor dem Cursor
	let query = $state<string | null>(null);
	let active = $state(0);
	const suggestions = $derived(
		query === null
			? []
			: people
					.filter((p) => p.id !== meId && p.name.toLowerCase().includes(query!.toLowerCase()))
					.slice(0, 6)
	);

	function updateQuery() {
		const before = text.slice(0, field.selectionStart);
		const m = before.match(/(?:^|\s)@([^\s@]{0,24})$/);
		query = m ? m[1] : null;
		active = 0;
	}

	function pick(person: { id: number; name: string }) {
		const pos = field.selectionStart;
		const before = text.slice(0, pos).replace(/@([^\s@]{0,24})$/, `@${person.name} `);
		text = before + text.slice(pos);
		mentionIds.add(person.id);
		query = null;
		queueMicrotask(() => {
			field.focus();
			field.setSelectionRange(before.length, before.length);
			resize();
		});
	}

	function resize() {
		field.style.height = 'auto';
		field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
	}

	async function send() {
		const body = text.trim();
		if (!body || sending) return;
		sending = true;
		const ok = await onsend({ body, mentionIds: [...mentionIds] });
		sending = false;
		if (ok) {
			text = '';
			mentionIds.clear();
			queueMicrotask(resize);
		}
		field.focus();
	}

	function onkeydown(e: KeyboardEvent) {
		if (suggestions.length) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				active =
					(active + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
				return;
			}
			if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				pick(suggestions[active]);
				return;
			}
			if (e.key === 'Escape') {
				query = null;
				return;
			}
		}
		// Am Computer sendet Enter, Shift+Enter macht eine neue Zeile; auf dem Handy der Knopf
		if (e.key === 'Enter' && !e.shiftKey && !coarse) {
			e.preventDefault();
			void send();
		}
	}

	/** Von aussen (Zitieren): Fokus ins Feld. */
	export function focus() {
		field?.focus();
	}
</script>

<div class="composer">
	{#if suggestions.length}
		<ul class="suggest" role="listbox" aria-label="Person erwähnen">
			{#each suggestions as p, i (p.id)}
				<li>
					<button
						type="button"
						class:active={i === active}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => pick(p)}
					>
						<Avatar name={p.name} id={p.id} size={24} />
						{p.name}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if replyTo}
		<div class="reply">
			<div>
				<strong>{replyTo.author.id === meId ? 'Du' : replyTo.author.name}</strong>
				<span>{chatExcerpt(replyTo.body, 100)}</span>
			</div>
			<button type="button" onclick={() => (replyTo = null)} aria-label="Zitat entfernen">
				<X size={16} />
			</button>
		</div>
	{/if}

	<div class="row input">
		<textarea
			bind:this={field}
			bind:value={text}
			rows="1"
			maxlength={MAX_MESSAGE_LENGTH}
			placeholder="Nachricht …"
			aria-label="Nachricht"
			oninput={() => {
				resize();
				updateQuery();
			}}
			onclick={updateQuery}
			{onkeydown}></textarea>
		<button class="send" onclick={send} disabled={!text.trim() || sending} aria-label="Senden">
			<SendHorizontal size={20} />
		</button>
	</div>
</div>

<style>
	.composer {
		position: relative;
		display: grid;
		gap: 6px;
		padding: 8px 0 10px;
	}

	.input {
		--gap: 8px;
		align-items: flex-end;
	}

	textarea {
		flex: 1;
		min-height: 44px;
		max-height: 160px;
		padding: 11px 16px;
		border-radius: 22px;
		resize: none;
		line-height: 1.4;
		font-size: 16px; /* verhindert das Zoomen auf dem iPhone */
	}

	.send {
		display: grid;
		place-items: center;
		flex: none;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-text);
		cursor: pointer;
	}

	.send:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.reply {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 8px 6px 12px;
		border-left: 3px solid var(--accent);
		border-radius: 8px;
		background: var(--surface);
		font-size: 13px;
	}

	.reply div {
		flex: 1;
		display: grid;
		min-width: 0;
	}

	.reply strong {
		color: var(--accent);
	}

	.reply span {
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.reply button {
		display: grid;
		padding: 6px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}

	.suggest {
		position: absolute;
		left: 0;
		bottom: 100%;
		z-index: 5;
		min-width: 220px;
		margin: 0 0 4px;
		padding: 4px;
		list-style: none;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);
	}

	.suggest button {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 7px 10px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.suggest button.active,
	.suggest button:hover {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
	}
</style>
