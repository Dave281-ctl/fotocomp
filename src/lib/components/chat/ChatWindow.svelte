<script lang="ts">
	import { onMount, tick } from 'svelte';
	import {
		Bell,
		BellOff,
		ChevronLeft,
		Copy,
		Layers,
		LifeBuoy,
		Pin,
		PinOff,
		Reply,
		Trash2,
		X
	} from '@lucide/svelte';
	import { QUICK_REACTIONS, retentionLabel } from '../../chat-rules.ts';
	import { onLive, refreshUnread, setOpenChat } from '#lib/chat-live.svelte.ts';
	import { formatDay, zurichParts } from '../../schedule.ts';
	import type { ChatMessage, ChatPin } from '../../types.ts';
	import Avatar from '../Avatar.svelte';
	import ChatBubble from './ChatBubble.svelte';
	import ChatComposer from './ChatComposer.svelte';

	interface Props {
		chat: { id: number; kind: 'direct' | 'theme' | 'help' };
		header: { title: string; person: { id: number; name: string } | null; themeId: number | null };
		people: { id: number; name: string }[];
		initial: ChatMessage[];
		more: boolean;
		lastRead: number;
		write: boolean;
		muted: boolean;
		pins: ChatPin[];
		retention: { adminDays: number; ownDays: number };
		me: { id: number; isAdmin: boolean };
	}
	let props: Props = $props();
	// Der Verlauf lebt hier weiter (Echtzeit, Nachladen) – Startwerte aus den Props
	// svelte-ignore state_referenced_locally
	let messages = $state<ChatMessage[]>(props.initial);
	// svelte-ignore state_referenced_locally
	let more = $state(props.more);
	// svelte-ignore state_referenced_locally
	let muted = $state(props.muted);
	// svelte-ignore state_referenced_locally
	let pins = $state<ChatPin[]>(props.pins);
	let pinIndex = $state(0);
	let pinMenu = $state(false);
	let deleting = $state<ChatMessage | null>(null);
	let replyTo = $state<ChatMessage | null>(null);
	let menu = $state<ChatMessage | null>(null);
	let allEmojis = $state(false);
	let muteMenu = $state(false);
	let error = $state('');
	let scroller: HTMLDivElement;
	let composer = $state<ReturnType<typeof ChatComposer>>();

	const EMOJIS =
		'😀 😃 😄 😁 😆 😅 🤣 😊 😇 🙂 😉 😍 🥰 😘 😎 🤩 🥳 🤔 🤨 😐 😴 😮 😯 😲 😢 😭 😤 😡 🤯 😱 🙈 🙌 👏 👍 👎 👌 ✌️ 🤞 💪 🙏 ❤️ 🧡 💛 💚 💙 💜 🔥 ✨ ⭐ 🌟 📸 🎉 🏆 🥇 🌈 🌲 🌊 ☀️ 🌙 💯'.split(
			' '
		);

	const dayOf = (d: Date) => zurichParts(d).date;
	const nearBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;

	async function scrollToBottom() {
		await tick();
		scroller.scrollTop = scroller.scrollHeight;
	}

	// Gelesen markieren (nur für die eigenen Zähler)
	let readSent = 0;
	function markRead() {
		const last = messages.at(-1)?.id ?? 0;
		if (!last || last <= readSent || document.hidden) return;
		readSent = last;
		void fetch(`/api/chat/${props.chat.id}/read`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ lastId: last })
		}).then(refreshUnread);
	}

	/** Nachricht einfügen oder ersetzen; `onlyExisting`: nur ersetzen (z.B. «für mich gelöscht» bleibt weg). */
	function upsert(m: ChatMessage, onlyExisting = false) {
		const i = messages.findIndex((x) => x.id === m.id);
		if (i >= 0) messages[i] = m;
		else if (!onlyExisting) messages = [...messages, m].sort((a, b) => a.id - b.id);
	}

	/** Nach einer Unterbrechung (App im Hintergrund): die neuesten Nachrichten neu holen. */
	async function resync() {
		const res = await fetch(`/api/chat/${props.chat.id}/messages`);
		if (!res.ok) return;
		const data = await res.json();
		const stick = nearBottom();
		for (const m of data.messages) upsert({ ...m, createdAt: new Date(m.createdAt) });
		if (stick) await scrollToBottom();
		markRead();
	}

	onMount(() => {
		setOpenChat(props.chat.id);
		// Beim Öffnen: zur ersten ungelesenen Nachricht, sonst ganz nach unten
		const firstUnread = messages.find((m) => m.id > props.lastRead && m.author.id !== props.me.id);
		void tick().then(() => {
			const el = firstUnread && document.getElementById(`m-${firstUnread.id}`);
			if (el && firstUnread !== messages[0]) el.scrollIntoView({ block: 'center' });
			else scroller.scrollTop = scroller.scrollHeight;
			markRead();
		});
		const off = onLive(async (e) => {
			if (e.type === 'reconnected') return resync();
			if (e.type === 'unread' || e.chatId !== props.chat.id) return;
			if (e.type === 'pins') {
				// Nur Anheftungen von Nachrichten, die ich auch sehe (nicht «für mich gelöscht»)
				pins = e.pins.filter((p) => !hidden.has(p.messageId));
				pinIndex = 0;
				return;
			}
			const stick = nearBottom() || e.message.author.id === props.me.id;
			upsert(e.message, e.type === 'update');
			if (e.type === 'message') {
				if (stick) await scrollToBottom();
				markRead();
			}
		});
		const onVisible = () => !document.hidden && markRead();
		document.addEventListener('visibilitychange', onVisible);

		// iPhone: Tastatur verkleinert den sichtbaren Bereich – Eingabe darüber halten
		const vv = window.visualViewport;
		const onResize = () => {
			if (!vv) return;
			const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
			document.documentElement.style.setProperty('--kb', `${kb}px`);
		};
		vv?.addEventListener('resize', onResize);
		return () => {
			off();
			setOpenChat(null);
			document.removeEventListener('visibilitychange', onVisible);
			vv?.removeEventListener('resize', onResize);
			document.documentElement.style.removeProperty('--kb');
		};
	});

	let loadingOlder = $state(false);
	async function loadOlder() {
		if (loadingOlder || !more) return;
		loadingOlder = true;
		const res = await fetch(`/api/chat/${props.chat.id}/messages?vor=${messages[0]?.id ?? ''}`);
		if (res.ok) {
			const data = await res.json();
			const height = scroller.scrollHeight;
			messages = [
				...data.messages.map((m: ChatMessage) => ({ ...m, createdAt: new Date(m.createdAt) })),
				...messages
			];
			more = data.more;
			await tick();
			// Position halten, damit nichts springt
			scroller.scrollTop += scroller.scrollHeight - height;
		}
		loadingOlder = false;
	}

	async function send(input: { body: string; mentionIds: number[] }) {
		error = '';
		const res = await fetch(`/api/chat/${props.chat.id}/messages`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ...input, replyToId: replyTo?.id ?? null })
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			error = data.error ?? 'Die Nachricht konnte nicht gesendet werden.';
			return false;
		}
		upsert({ ...data, createdAt: new Date(data.createdAt) });
		replyTo = null;
		await scrollToBottom();
		return true;
	}

	async function react(m: ChatMessage, emoji: string) {
		menu = null;
		allEmojis = false;
		const res = await fetch(`/api/chat/nachricht/${m.id}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ emoji })
		});
		if (res.ok) {
			const data = await res.json();
			upsert({ ...data, createdAt: new Date(data.createdAt) });
		}
	}

	/** Löschen fragt: nur für mich oder (bei eigenen Nachrichten) für alle. */
	function askDelete(m: ChatMessage) {
		menu = null;
		deleting = m;
	}

	// In dieser Sitzung «für mich gelöscht» (für Anheftungen, die per Echtzeit kommen)
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- nur intern
	const hidden = new Set<number>();

	async function deleteForMe(m: ChatMessage) {
		deleting = null;
		const res = await fetch(`/api/chat/nachricht/${m.id}/ausblenden`, { method: 'POST' });
		if (res.ok) {
			hidden.add(m.id);
			messages = messages.filter((x) => x.id !== m.id);
			pins = pins.filter((p) => p.messageId !== m.id);
		}
	}

	async function deleteForAll(m: ChatMessage) {
		deleting = null;
		const res = await fetch(`/api/chat/nachricht/${m.id}`, { method: 'DELETE' });
		if (res.ok) {
			const data = await res.json();
			upsert({ ...data, createdAt: new Date(data.createdAt) });
		}
	}

	/** Für alle oben anheften (Stunden) bzw. lösen (0). */
	async function pin(m: ChatMessage, hours: number) {
		menu = null;
		pinMenu = false;
		const res = await fetch(`/api/chat/nachricht/${m.id}/anheften`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ hours })
		});
		const data = await res.json().catch(() => null);
		if (!res.ok) {
			error = data?.error ?? 'Das hat nicht geklappt.';
			return;
		}
		pins = data.map((p: ChatPin) => ({ ...p, until: new Date(p.until) }));
		pinIndex = 0;
	}

	const isPinned = (m: ChatMessage) => pins.some((p) => p.messageId === m.id);
	const currentPin = $derived(pins.length ? pins[pinIndex % pins.length] : null);

	function reply(m: ChatMessage) {
		menu = null;
		if (!props.write) return;
		replyTo = m;
		composer?.focus();
	}

	function jumpTo(id: number) {
		const el = document.getElementById(`m-${id}`);
		if (!el) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		el.classList.add('flash');
		setTimeout(() => el.classList.remove('flash'), 1200);
	}

	async function mute(hours: number | null) {
		muteMenu = false;
		await fetch(`/api/chat/${props.chat.id}/mute`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ hours })
		});
		muted = hours !== 0;
		refreshUnread();
	}

	const canDelete = (m: ChatMessage) =>
		m.author.id === props.me.id || (props.me.isAdmin && props.chat.kind !== 'direct');
	const titleHref = $derived(
		props.header.person
			? `/person/${props.header.person.id}`
			: props.header.themeId
				? `/themen/${props.header.themeId}`
				: null
	);
	const subtitle = $derived(
		props.chat.kind === 'help'
			? 'Fragen an die Admins · für alle sichtbar'
			: props.chat.kind === 'theme'
				? `${props.people.length} ${props.people.length === 1 ? 'Teilnehmer' : 'Teilnehmende'}`
				: ''
	);
</script>

<div class="chat" data-no-pull>
	<header class="row">
		<a class="back" href="/chat" aria-label="Zurück zur Chatliste"><ChevronLeft size={22} /></a>
		{#if props.header.person}
			<Avatar name={props.header.person.name} id={props.header.person.id} size={36} />
		{:else}
			<span class="icon" class:help={props.chat.kind === 'help'}>
				{#if props.chat.kind === 'help'}<LifeBuoy size={18} />{:else}<Layers size={18} />{/if}
			</span>
		{/if}
		<div class="title">
			{#if titleHref}<a href={titleHref}><strong>{props.header.title}</strong></a>{:else}<strong>
					{props.header.title}
				</strong>{/if}
			{#if subtitle}<span>{subtitle}</span>{/if}
		</div>
		<div class="mute">
			<button
				onclick={() => (muteMenu = !muteMenu)}
				aria-label={muted ? 'Stummgeschaltet' : 'Stummschalten'}
				title={muted ? 'Stummgeschaltet' : 'Stummschalten'}
			>
				{#if muted}<BellOff size={20} />{:else}<Bell size={20} />{/if}
			</button>
			{#if muteMenu}
				<div class="popover">
					{#if muted}
						<button onclick={() => mute(0)}>Wieder benachrichtigen</button>
					{:else}
						<button onclick={() => mute(8)}>Stumm für 8 Stunden</button>
						<button onclick={() => mute(168)}>Stumm für 1 Woche</button>
						<button onclick={() => mute(null)}>Immer stumm</button>
					{/if}
					<p>Erwähnungen und Antworten an dich kommen trotzdem.</p>
				</div>
			{/if}
		</div>
	</header>

	<!-- Angeheftete Nachrichten: antippen springt hin (und zur nächsten), ✕ löst -->
	{#if currentPin}
		<div class="pins">
			<button
				class="pin-main"
				onclick={() => {
					jumpTo(currentPin.messageId);
					pinIndex = (pinIndex + 1) % pins.length;
				}}
			>
				<Pin size={15} />
				<span class="pin-text">
					<strong>{currentPin.author}:</strong>
					{currentPin.excerpt}
				</span>
				{#if pins.length > 1}<span class="pin-count">
						{(pinIndex % pins.length) + 1}/{pins.length}
					</span>{/if}
			</button>
			{#if props.write}
				<button
					class="pin-off"
					onclick={() => {
						const m = messages.find((x) => x.id === currentPin.messageId);
						if (m) void pin(m, 0);
					}}
					aria-label="Anheftung lösen"
					title="Angeheftet von {currentPin.pinnedBy} – lösen"
				>
					<X size={16} />
				</button>
			{/if}
		</div>
	{/if}

	<div
		class="scroller"
		bind:this={scroller}
		onscroll={() => scroller.scrollTop < 80 && loadOlder()}
	>
		<div class="inner">
			<p class="retention">
				Nachrichten werden nach {retentionLabel(props.retention.adminDays)} gelöscht{#if props.retention.ownDays < props.retention.adminDays}
					· deine nach {retentionLabel(props.retention.ownDays)}{/if}
			</p>
			{#if more}
				<button class="older" onclick={loadOlder} disabled={loadingOlder}>
					Ältere Nachrichten laden
				</button>
			{/if}
			{#each messages as m, i (m.id)}
				{@const prev = messages[i - 1]}
				{#if !prev || dayOf(prev.createdAt) !== dayOf(m.createdAt)}
					<p class="day"><span>{formatDay(dayOf(m.createdAt))}</span></p>
				{/if}
				{#if m.id > props.lastRead && m.author.id !== props.me.id && (!prev || prev.id <= props.lastRead)}
					<p class="new-divider"><span>Neue Nachrichten</span></p>
				{/if}
				<ChatBubble
					message={m}
					own={m.author.id === props.me.id}
					showName={props.chat.kind !== 'direct' &&
						(!prev ||
							prev.author.id !== m.author.id ||
							dayOf(prev.createdAt) !== dayOf(m.createdAt) ||
							m.createdAt.getTime() - prev.createdAt.getTime() > 10 * 60_000)}
					meId={props.me.id}
					onmenu={(x) => (menu = x)}
					onreply={reply}
					ondelete={askDelete}
					onquote={jumpTo}
				/>
			{:else}
				<p class="empty">
					{props.chat.kind === 'help'
						? 'Hast du eine Frage zu Fotocomp? Schreib sie hier – die Admins antworten, und alle können mitlesen.'
						: 'Noch keine Nachrichten. Schreib die erste!'}
				</p>
			{/each}
		</div>
	</div>

	<div class="bottom">
		{#if error}<p class="error">{error}</p>{/if}
		{#if props.write}
			<ChatComposer
				bind:this={composer}
				bind:replyTo
				people={props.people}
				meId={props.me.id}
				onsend={send}
			/>
		{:else}
			<p class="readonly">Dieses Thema ist beendet – der Chat kann nur noch gelesen werden.</p>
		{/if}
	</div>
</div>

<!-- Menü einer Nachricht -->
{#if menu}
	{@const m = menu}
	<div
		class="backdrop"
		role="presentation"
		onclick={() => {
			menu = null;
			allEmojis = false;
		}}
	></div>
	<div class="menu card" role="dialog" aria-label="Nachricht">
		{#if props.write}
			<div class="quick">
				{#each QUICK_REACTIONS as e (e)}
					<button
						class:mine={m.reactions.some(
							(r) => r.emoji === e && r.users.some((u) => u.id === props.me.id)
						)}
						onclick={() => react(m, e)}
					>
						{e}
					</button>
				{/each}
				<button class="plus" onclick={() => (allEmojis = !allEmojis)} aria-label="Weitere Emojis">
					＋
				</button>
			</div>
			{#if allEmojis}
				<div class="grid">
					{#each EMOJIS as e (e)}<button onclick={() => react(m, e)}>{e}</button>{/each}
				</div>
			{/if}
			<button class="action" onclick={() => reply(m)}><Reply size={18} /> Antworten</button>
			{#if isPinned(m)}
				<button class="action" onclick={() => pin(m, 0)}><PinOff size={18} /> Lösen</button>
			{:else}
				<button class="action" onclick={() => (pinMenu = !pinMenu)}>
					<Pin size={18} /> Für alle anheften …
				</button>
				{#if pinMenu}
					<div class="durations">
						<button onclick={() => pin(m, 1)}>1 Std.</button>
						<button onclick={() => pin(m, 12)}>12 Std.</button>
						<button onclick={() => pin(m, 24)}>1 Tag</button>
						<button onclick={() => pin(m, 72)}>3 Tage</button>
					</div>
				{/if}
			{/if}
		{/if}
		<button
			class="action"
			onclick={() => {
				void navigator.clipboard?.writeText(m.body);
				menu = null;
			}}
		>
			<Copy size={18} /> Kopieren
		</button>
		<button class="action danger" onclick={() => askDelete(m)}><Trash2 size={18} /> Löschen</button>
	</div>
{/if}

<!-- Löschen: für mich oder für alle -->
{#if deleting}
	{@const m = deleting}
	<div class="backdrop" role="presentation" onclick={() => (deleting = null)}></div>
	<div class="menu card" role="dialog" aria-label="Nachricht löschen">
		<p class="ask">Nachricht löschen?</p>
		<button class="action danger" onclick={() => deleteForMe(m)}>
			<Trash2 size={18} /> Für mich löschen
		</button>
		{#if canDelete(m) && !m.deleted}
			<button class="action danger" onclick={() => deleteForAll(m)}>
				<Trash2 size={18} />
				{props.chat.kind === 'direct' ? 'Für beide löschen' : 'Für alle löschen'}
			</button>
		{/if}
		<button class="action" onclick={() => (deleting = null)}>Abbrechen</button>
		<p class="hint">
			«Für mich» blendet die Nachricht nur in deinem Verlauf aus{canDelete(m) && !m.deleted
				? '; «für alle» ersetzt sie bei allen durch «Nachricht gelöscht».'
				: '.'}
		</p>
	</div>
{/if}

<style>
	/* Füllt den Platz zwischen Kopfzeile und Menü; nur der Verlauf scrollt */
	.chat {
		position: fixed;
		z-index: 10;
		top: var(--nav-h);
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}

	@media (max-width: 720px) {
		.chat {
			bottom: max(calc(var(--nav-h) + env(safe-area-inset-bottom)), var(--kb, 0px));
		}
	}

	header,
	.inner,
	.bottom {
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
		padding-left: var(--gutter);
		padding-right: var(--gutter);
	}

	header {
		--gap: 10px;
		flex: none;
		min-height: 60px;
		border-bottom: 1px solid var(--line);
	}

	.back {
		display: grid;
		margin-left: -6px;
		padding: 4px;
		color: var(--muted);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--accent) 16%, var(--surface-2));
		color: var(--accent);
	}

	.icon.help {
		background: color-mix(in srgb, var(--ok) 16%, var(--surface-2));
		color: var(--ok);
	}

	.title {
		flex: 1;
		display: grid;
		min-width: 0;
	}

	.title strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title a:hover strong {
		text-decoration: underline;
	}

	.title span {
		font-size: 12px;
		color: var(--muted);
	}

	.mute {
		position: relative;
	}

	.mute > button {
		display: grid;
		padding: 8px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}

	.popover {
		position: absolute;
		right: 0;
		top: 100%;
		z-index: 20;
		display: grid;
		width: 230px;
		padding: 6px;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
	}

	.popover button {
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

	.popover p {
		margin: 4px 10px 6px;
		font-size: 12px;
		color: var(--muted);
	}

	.pins {
		flex: none;
		display: flex;
		align-items: center;
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
		padding: 0 var(--gutter);
		border-bottom: 1px solid var(--line);
		background: color-mix(in srgb, var(--accent) 8%, var(--bg));
	}

	.pin-main {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		padding: 9px 0;
		border: 0;
		background: none;
		color: var(--accent);
		font: inherit;
		font-size: 14px;
		text-align: left;
		cursor: pointer;
	}

	.pin-text {
		flex: 1;
		min-width: 0;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pin-text strong {
		font-weight: 600;
	}

	.pin-count {
		flex: none;
		font-size: 12px;
		color: var(--muted);
	}

	.pin-off {
		display: grid;
		padding: 6px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}

	.durations {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 0 10px 8px 40px;
	}

	.durations button {
		padding: 6px 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}

	.durations button:hover {
		border-color: var(--accent);
	}

	.ask {
		margin: 4px 10px 8px;
		font-weight: 600;
	}

	.hint {
		margin: 6px 10px 2px;
		font-size: 12px;
		color: var(--muted);
	}

	.scroller {
		flex: 1;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--surface-2) transparent;
	}

	.inner {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 10px;
		padding-bottom: 10px;
	}

	.retention {
		align-self: center;
		margin: 2px 0 8px;
		padding: 3px 12px;
		border-radius: 999px;
		background: var(--surface);
		font-size: 12px;
		color: var(--muted);
	}

	.older {
		align-self: center;
		padding: 6px 14px;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}

	.day,
	.new-divider {
		display: flex;
		justify-content: center;
		margin: 10px 0 4px;
		font-size: 12px;
		color: var(--muted);
	}

	.day span {
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--surface);
	}

	.new-divider span {
		color: var(--accent);
		font-weight: 600;
	}

	.empty {
		margin: 20vh auto 0;
		max-width: 360px;
		text-align: center;
		color: var(--muted);
	}

	:global(.flash > div) {
		animation: flash 1.2s ease;
	}

	@keyframes flash {
		30% {
			box-shadow: 0 0 0 3px var(--accent);
		}
	}

	.bottom {
		flex: none;
		border-top: 1px solid var(--line);
	}

	.bottom .error {
		margin: 8px 0 0;
	}

	.readonly {
		margin: 14px 0;
		text-align: center;
		font-size: 14px;
		color: var(--muted);
	}

	/* Menü einer Nachricht: unten auf dem Handy, mittig am Computer */
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgb(0 0 0 / 0.45);
	}

	.menu {
		position: fixed;
		z-index: 41;
		left: 50%;
		bottom: calc(env(safe-area-inset-bottom) + 16px);
		transform: translateX(-50%);
		display: grid;
		gap: 2px;
		width: min(92vw, 360px);
		padding: 10px;
		box-shadow: 0 16px 50px rgb(0 0 0 / 0.5);
	}

	@media (min-width: 721px) {
		.menu {
			bottom: auto;
			top: 40%;
		}
	}

	.quick,
	.grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 2px;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--line);
		margin-bottom: 4px;
	}

	.grid {
		justify-content: flex-start;
		max-height: 180px;
		overflow-y: auto;
	}

	.quick button,
	.grid button {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border: 0;
		border-radius: 50%;
		background: none;
		font-size: 24px;
		cursor: pointer;
	}

	.grid button {
		width: 38px;
		height: 38px;
		font-size: 21px;
	}

	.quick button:hover,
	.grid button:hover,
	.quick button.mine {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
	}

	.quick .plus {
		font-size: 18px;
		color: var(--muted);
		background: var(--surface-2);
	}

	.action {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 10px;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.action:hover {
		background: var(--surface-2);
	}

	.action.danger {
		color: var(--danger);
	}
</style>
