/**
 * Echtzeit im Browser: eine Verbindung für die ganze App (Server-Sent Events).
 * Sie trennt sich, wenn die App im Hintergrund ist, und verbindet sich beim
 * Zurückkehren neu – dann holen offene Chats Verpasstes nach.
 */
import type { ChatMessage, ChatPin } from './types.ts';

export type LiveEvent =
	| { type: 'message' | 'update'; chatId: number; message: ChatMessage }
	| { type: 'pins'; chatId: number; pins: ChatPin[] }
	| { type: 'unread' }
	| { type: 'reconnected' };

export const live = $state({ unread: 0 });

let source: EventSource | null = null;
let openChat: number | null = null;
let started = false;
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- nur intern, nicht angezeigt
const handlers = new Set<(event: LiveEvent) => void>();

const revive = (m: ChatMessage): ChatMessage => ({ ...m, createdAt: new Date(m.createdAt) });

function emit(event: LiveEvent) {
	for (const h of handlers) h(event);
}

let unreadTimer: ReturnType<typeof setTimeout> | undefined;
/** Zähler im Menü nachführen (kurz gebündelt). */
export function refreshUnread() {
	clearTimeout(unreadTimer);
	unreadTimer = setTimeout(async () => {
		const res = await fetch('/api/chat/ungelesen').catch(() => null);
		if (res?.ok) live.unread = (await res.json()).unread;
	}, 300);
}

function connect() {
	source?.close();
	source = new EventSource(`/api/chat/events${openChat ? `?offen=${openChat}` : ''}`);
	let first = true;
	source.onopen = () => {
		if (!first) emit({ type: 'reconnected' });
		first = false;
	};
	source.onmessage = (e) => {
		const event = JSON.parse(e.data);
		if (event.type === 'message' || event.type === 'update') {
			emit({ ...event, message: revive(event.message) });
			if (event.type === 'message' && event.chatId !== openChat) refreshUnread();
		} else if (event.type === 'pins') {
			emit({
				...event,
				pins: event.pins.map((p: ChatPin) => ({ ...p, until: new Date(p.until) }))
			});
		} else if (event.type === 'unread') {
			refreshUnread();
		}
	};
}

/** Einmal beim Start der App (angemeldet). */
export function startLive(initialUnread: number) {
	live.unread = initialUnread;
	if (started) return;
	started = true;
	connect();
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			source?.close();
			source = null;
		} else {
			connect();
			emit({ type: 'reconnected' });
			refreshUnread();
		}
	});
}

/** Dieser Chat ist gerade offen (kein Push dafür) – null beim Verlassen. */
export function setOpenChat(id: number | null) {
	if (openChat === id) return;
	openChat = id;
	if (started && !document.hidden) connect();
}

export function onLive(handler: (event: LiveEvent) => void) {
	handlers.add(handler);
	return () => handlers.delete(handler);
}
