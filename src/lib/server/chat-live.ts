/**
 * Echtzeit für den Chat: Jeder offene Browser hält eine Verbindung
 * (Server-Sent Events) und bekommt neue Nachrichten, Reaktionen und
 * Löschungen sofort. Alles im Speicher dieses einen Prozesses – Fotocomp
 * läuft als einzelner Container, mehr braucht es nicht.
 */

export type ChatEvent =
	| { type: 'message'; chatId: number; message: unknown }
	| { type: 'update'; chatId: number; message: unknown }
	| { type: 'unread' };

interface Listener {
	send: (event: ChatEvent) => void;
	/** Der Chat, den dieser Browser gerade offen hat (dann kein Push dafür). */
	openChat: number | null;
}

const listeners = new Map<number, Set<Listener>>();

export function subscribe(userId: number, listener: Listener) {
	const set = listeners.get(userId) ?? new Set();
	set.add(listener);
	listeners.set(userId, set);
	return () => {
		set.delete(listener);
		if (set.size === 0) listeners.delete(userId);
	};
}

export function publish(userIds: number[], event: ChatEvent) {
	for (const id of userIds) for (const l of listeners.get(id) ?? []) l.send(event);
}

/** Hat die Person diesen Chat gerade offen (in einem sichtbaren Fenster)? */
export function isViewing(userId: number, chatId: number) {
	return [...(listeners.get(userId) ?? [])].some((l) => l.openChat === chatId);
}
