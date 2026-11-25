/**
 * Regeln des Chats – reine Funktionen für Server und Browser, damit sie testbar bleiben.
 */

// --------------------------------------------------------------- Aufbewahrung

/** Wählbare Aufbewahrungszeiten in Tagen. */
export const RETENTION_OPTIONS = [1, 3, 7, 14, 30, 90, 180] as const;
export const DEFAULT_RETENTION_DAYS = 14;
export const MAX_RETENTION_DAYS = 180;

/** «1 Tag», «2 Wochen», «6 Monate» */
export function retentionLabel(days: number): string {
	if (days % 30 === 0) return days === 30 ? '1 Monat' : `${days / 30} Monate`;
	if (days % 7 === 0) return days === 7 ? '1 Woche' : `${days / 7} Wochen`;
	return days === 1 ? '1 Tag' : `${days} Tage`;
}

/** Vorgabe des Admins, auf den erlaubten Bereich begrenzt. */
export function adminRetention(value: string | number | null | undefined): number {
	const days = Number(value);
	return Number.isInteger(days) && days >= 1
		? Math.min(days, MAX_RETENTION_DAYS)
		: DEFAULT_RETENTION_DAYS;
}

/** Wie lange eine Nachricht bleibt: die kürzere Zeit von Admin-Vorgabe und Verfasser. */
export function effectiveRetention(adminDays: number, authorDays: number | null): number {
	return authorDays ? Math.min(adminDays, authorDays) : adminDays;
}

/** Die Zeiten, die eine Person für ihre eigenen Nachrichten wählen kann. */
export function userRetentionOptions(adminDays: number) {
	return RETENTION_OPTIONS.filter((d) => d <= adminDays);
}

export const expiresAt = (sentAt: Date, days: number) =>
	new Date(sentAt.getTime() + days * 86_400_000);

// --------------------------------------------------------------- Mitteilungen

/** Push-Einstellungen für den Chat (Mails gibt es für den Chat bewusst keine). */
export interface ChatNotifyPrefs {
	direct: boolean;
	mentions: boolean;
	replies: boolean;
	/** Themen-Chats: alle Nachrichten, nur Erwähnungen (bzw. Antworten) oder gar nicht */
	theme: 'all' | 'mentions' | 'off';
}

export const DEFAULT_CHAT_NOTIFY: ChatNotifyPrefs = {
	direct: true,
	mentions: true,
	replies: true,
	theme: 'mentions'
};

export function resolveChatNotify(stored: Partial<ChatNotifyPrefs> | null): ChatNotifyPrefs {
	return { ...DEFAULT_CHAT_NOTIFY, ...(stored ?? {}) };
}

export type ChatKind = 'direct' | 'theme' | 'help';

/** Warum jemand über eine neue Nachricht benachrichtigt wird – oder null. */
export function pushReason(input: {
	kind: ChatKind;
	prefs: ChatNotifyPrefs;
	mentioned: boolean;
	repliedTo: boolean;
	isAdmin: boolean;
	muted: boolean;
}): 'mention' | 'reply' | 'direct' | 'help' | 'theme' | null {
	const { kind, prefs, mentioned, repliedTo, isAdmin, muted } = input;
	// Erwähnungen und Antworten kommen auch in stummgeschalteten Chats
	if (mentioned && prefs.mentions) return 'mention';
	if (repliedTo && prefs.replies) return 'reply';
	if (muted) return null;
	if (kind === 'direct') return prefs.direct ? 'direct' : null;
	if (kind === 'help') return isAdmin ? 'help' : null;
	return prefs.theme === 'all' ? 'theme' : null;
}

/** Nachts (22–07 Uhr) kommen nur Einzelchats, Erwähnungen und Antworten. */
export const urgentReason = (reason: string) =>
	reason === 'mention' || reason === 'reply' || reason === 'direct';

// --------------------------------------------------------------- Darstellung

/** Schnelle Reaktionen im Menü einer Nachricht. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'] as const;

export const MAX_MESSAGE_LENGTH = 2000;

export type Segment =
	| { type: 'text'; text: string }
	| { type: 'mention'; text: string; userId: number }
	| { type: 'link'; text: string; href: string }
	| { type: 'photo'; text: string; photoId: number };

const URL_RE = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)]/g;

/**
 * Zerlegt eine Nachricht in Text, Erwähnungen (@Name) und Links. Ein Link auf
 * ein Foto dieser Plattform wird als Foto erkannt (für die Vorschau).
 */
export function segments(
	body: string,
	mentions: { id: number; name: string }[],
	origin: string
): Segment[] {
	// Erst die Links, dann im übrigen Text die Erwähnungen (längste Namen zuerst)
	const parts: Segment[] = [];
	let last = 0;
	for (const m of body.matchAll(URL_RE)) {
		if (m.index > last) parts.push({ type: 'text', text: body.slice(last, m.index) });
		const href = m[0];
		const photo = href.startsWith(origin)
			? href.slice(origin.length).match(/^\/foto\/(\d+)\/?$/)
			: null;
		parts.push(
			photo
				? { type: 'photo', text: href, photoId: Number(photo[1]) }
				: { type: 'link', text: href, href }
		);
		last = m.index + href.length;
	}
	if (last < body.length) parts.push({ type: 'text', text: body.slice(last) });

	const names = [...mentions].sort((a, b) => b.name.length - a.name.length);
	if (names.length === 0) return parts;
	const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`@(${names.map((n) => escape(n.name)).join('|')})`, 'g');
	return parts.flatMap((part): Segment[] => {
		if (part.type !== 'text') return [part];
		const out: Segment[] = [];
		let pos = 0;
		for (const m of part.text.matchAll(re)) {
			if (m.index > pos) out.push({ type: 'text', text: part.text.slice(pos, m.index) });
			const who = names.find((n) => n.name === m[1])!;
			out.push({ type: 'mention', text: m[0], userId: who.id });
			pos = m.index + m[0].length;
		}
		if (pos < part.text.length) out.push({ type: 'text', text: part.text.slice(pos) });
		return out;
	});
}

/** Welche der genannten Personen kommen in der Nachricht als @Name vor? */
export function mentionedIn(body: string, candidates: { id: number; name: string }[]) {
	return candidates.filter((c) => body.includes(`@${c.name}`));
}

/** Kurzer Auszug für Zitate, Liste und Push. */
export function chatExcerpt(text: string, max = 80): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
