/**
 * Chat: Einzelchats, Gruppen pro Thema und der Hilfe-Chat mit den Admins.
 *
 * Zugriff:
 *  - Einzelchat: die beiden Personen
 *  - Themen-Chat: die aktuellen Teilnehmenden; nach dem Ende des Themas nur
 *    noch lesen (auch wer beim Beenden dabei war)
 *  - Hilfe-Chat: alle
 * Jede Nachricht hat ein Ablaufdatum (kürzere Zeit von Admin-Vorgabe und
 * Einstellung des Verfassers) und wird danach endgültig gelöscht.
 */
import { error } from '@sveltejs/kit';
import { and, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import {
	MAX_MESSAGE_LENGTH,
	adminRetention,
	chatExcerpt,
	effectiveRetention,
	expiresAt,
	mentionedIn,
	pushReason,
	resolveChatNotify,
	urgentReason,
	type ChatKind
} from '../chat-rules.ts';
import { isQuietHour } from '../notify.ts';
import { isThemeOpen, zurichParts } from '../schedule.ts';
import type { ChatMessage, ChatSummary } from '../types.ts';
import { isViewing, publish } from './chat-live.ts';
import { db } from './db.ts';
import { sendPush } from './push.ts';
import {
	chatMembers,
	chatMutes,
	chatReads,
	chats,
	messageMentions,
	messageReactions,
	messages,
	themeMembers,
	themes,
	users,
	type Chat,
	type User
} from './schema.ts';
import { getSettings } from './settings.ts';
import { UserError } from './errors.ts';

export const HELP_TITLE = 'Hilfe & Fragen';
const PAGE = 50;

// --------------------------------------------------------------- Chats finden

async function getOrCreate(key: string, kind: ChatKind, themeId: number | null = null) {
	await db.insert(chats).values({ key, kind, themeId }).onConflictDoNothing();
	const [chat] = await db.select().from(chats).where(eq(chats.key, key));
	return chat;
}

export const helpChat = () => getOrCreate('help', 'help');
export const themeChat = (themeId: number) => getOrCreate(`theme:${themeId}`, 'theme', themeId);

export async function directChat(a: number, b: number) {
	const [x, y] = [a, b].sort((m, n) => m - n);
	const chat = await getOrCreate(`direct:${x}:${y}`, 'direct');
	await db
		.insert(chatMembers)
		.values([
			{ chatId: chat.id, userId: x },
			{ chatId: chat.id, userId: y }
		])
		.onConflictDoNothing();
	return chat;
}

export async function getChat(id: number) {
	const [chat] = Number.isInteger(id) ? await db.select().from(chats).where(eq(chats.id, id)) : [];
	return chat ?? null;
}

// --------------------------------------------------------------- Zugriff

/** Darf die Person den Chat lesen bzw. schreiben? */
export async function access(chat: Chat, user: User): Promise<{ read: boolean; write: boolean }> {
	if (chat.kind === 'help') return { read: true, write: true };
	if (chat.kind === 'direct') {
		const [m] = await db
			.select()
			.from(chatMembers)
			.where(and(eq(chatMembers.chatId, chat.id), eq(chatMembers.userId, user.id)));
		return { read: !!m, write: !!m };
	}
	const [theme] = await db.select().from(themes).where(eq(themes.id, chat.themeId!));
	if (!theme) return { read: false, write: false };
	const rows = await db
		.select({ leftAt: themeMembers.leftAt })
		.from(themeMembers)
		.where(and(eq(themeMembers.themeId, theme.id), eq(themeMembers.userId, user.id)));
	const active = rows.some((r) => r.leftAt === null);
	// Wer beim Beenden des Themas dabei war, darf weiter lesen
	const endedWith = rows.some(
		(r) => theme.endedAt && r.leftAt && r.leftAt.getTime() === theme.endedAt.getTime()
	);
	const open = isThemeOpen(theme, new Date());
	return { read: active || endedWith, write: active && open };
}

/** Lädt einen Chat und prüft den Zugriff – sonst 404. */
export async function requireChat(id: number, user: User) {
	const chat = await getChat(id);
	if (!chat) error(404, 'Chat nicht gefunden');
	const rights = await access(chat, user);
	if (!rights.read) error(404, 'Chat nicht gefunden');
	return { chat, ...rights };
}

/** Wer gehört dazu? (für @-Erwähnungen und Benachrichtigungen) */
export async function chatPeople(chat: Chat) {
	const cols = { id: users.id, name: users.name, role: users.role, chatNotify: users.chatNotify };
	if (chat.kind === 'help') {
		return db.select(cols).from(users).where(eq(users.disabled, false)).orderBy(users.name);
	}
	if (chat.kind === 'direct') {
		return db
			.select(cols)
			.from(chatMembers)
			.innerJoin(users, eq(chatMembers.userId, users.id))
			.where(eq(chatMembers.chatId, chat.id))
			.orderBy(users.name);
	}
	return db
		.select(cols)
		.from(themeMembers)
		.innerJoin(users, eq(themeMembers.userId, users.id))
		.where(
			and(
				eq(themeMembers.themeId, chat.themeId!),
				isNull(themeMembers.leftAt),
				eq(users.disabled, false)
			)
		)
		.orderBy(users.name);
}

// --------------------------------------------------------------- Liste

/** Alle Chats einer Person, neueste Nachricht zuerst. */
export async function listChats(user: User): Promise<ChatSummary[]> {
	// Themen-Chats für alle eigenen (auch beendeten) Themen anlegen, damit sie auffindbar sind
	const memberThemes = await db
		.select({ theme: themes, leftAt: themeMembers.leftAt })
		.from(themeMembers)
		.innerJoin(themes, eq(themeMembers.themeId, themes.id))
		.where(eq(themeMembers.userId, user.id));
	const themeIds = new Set<number>();
	for (const { theme, leftAt } of memberThemes) {
		const endedWith = theme.endedAt && leftAt && leftAt.getTime() === theme.endedAt.getTime();
		if (leftAt === null || endedWith) themeIds.add(theme.id);
	}
	const themeChats = await Promise.all([...themeIds].map((id) => themeChat(id)));
	const titles = new Map(memberThemes.map((m) => [m.theme.id, m.theme]));

	const direct = await db
		.select({ chat: chats })
		.from(chatMembers)
		.innerJoin(chats, eq(chatMembers.chatId, chats.id))
		.where(eq(chatMembers.userId, user.id));
	const list: Chat[] = [...themeChats, ...direct.map((d) => d.chat)];
	// Den Hilfe-Chat sehen Admins in der Liste; alle anderen finden ihn im Profil
	if (user.role === 'admin') list.push(await helpChat());
	if (list.length === 0) return [];
	const ids = list.map((c) => c.id);

	const others = await db
		.select({ chatId: chatMembers.chatId, id: users.id, name: users.name })
		.from(chatMembers)
		.innerJoin(users, eq(chatMembers.userId, users.id))
		.where(and(inArray(chatMembers.chatId, ids), ne(chatMembers.userId, user.id)));

	const lastRows = await db
		.selectDistinctOn([messages.chatId], {
			chatId: messages.chatId,
			body: messages.body,
			deleted: messages.deletedAt,
			at: messages.createdAt,
			authorId: messages.authorId,
			author: users.name
		})
		.from(messages)
		.innerJoin(users, eq(messages.authorId, users.id))
		.where(inArray(messages.chatId, ids))
		.orderBy(messages.chatId, desc(messages.id));
	const last = new Map(lastRows.map((r) => [r.chatId, r]));
	const unread = await unreadCounts(user, ids);
	const mutes = await mutedChats(user.id, ids);
	const t = new Date();

	const result = list
		// Einzelchats ohne Nachricht (nur geöffnet) nicht anzeigen
		.filter((c) => c.kind !== 'direct' || last.has(c.id))
		.map((c): ChatSummary => {
			const person = others.find((o) => o.chatId === c.id) ?? null;
			const theme = c.themeId ? titles.get(c.themeId) : undefined;
			const l = last.get(c.id);
			return {
				id: c.id,
				kind: c.kind,
				title:
					c.kind === 'help'
						? HELP_TITLE
						: c.kind === 'theme'
							? (theme?.title ?? 'Thema')
							: (person?.name ?? 'Unbekannt'),
				person: person ? { id: person.id, name: person.name } : null,
				themeId: c.themeId,
				last: l
					? {
							author: l.author.split(' ')[0],
							excerpt: l.deleted ? 'Nachricht gelöscht' : chatExcerpt(l.body),
							at: l.at,
							own: l.authorId === user.id
						}
					: null,
				unread: unread.get(c.id)?.count ?? 0,
				mentioned: unread.get(c.id)?.mentioned ?? false,
				muted: mutes.has(c.id),
				readOnly: c.kind === 'theme' && !!theme && !isThemeOpen(theme, t)
			};
		});
	return result.sort(
		(a, b) =>
			(b.last?.at.getTime() ?? 0) - (a.last?.at.getTime() ?? 0) || a.title.localeCompare(b.title)
	);
}

/** Ungelesene Nachrichten anderer pro Chat, dazu ob man darin erwähnt wurde. */
async function unreadCounts(user: User, chatIds: number[]) {
	if (chatIds.length === 0) return new Map<number, { count: number; mentioned: boolean }>();
	const rows = await db
		.select({
			chatId: messages.chatId,
			count: sql<number>`count(*)::int`,
			mentioned: sql<boolean>`bool_or(${messageMentions.userId} is not null)`
		})
		.from(messages)
		.leftJoin(chatReads, and(eq(chatReads.chatId, messages.chatId), eq(chatReads.userId, user.id)))
		.leftJoin(
			messageMentions,
			and(eq(messageMentions.messageId, messages.id), eq(messageMentions.userId, user.id))
		)
		.where(
			and(
				inArray(messages.chatId, chatIds),
				ne(messages.authorId, user.id),
				isNull(messages.deletedAt),
				or(isNull(chatReads.lastReadId), gt(messages.id, chatReads.lastReadId))
			)
		)
		.groupBy(messages.chatId);
	return new Map(rows.map((r) => [r.chatId, { count: r.count, mentioned: r.mentioned }]));
}

/** Ungelesene Nachrichten in einem Chat. */
export async function chatUnread(user: User, chatId: number) {
	return (await unreadCounts(user, [chatId])).get(chatId)?.count ?? 0;
}

/** Gesamtzahl ungelesener Nachrichten (Zähler im Menü). Stumme Chats zählen nicht mit. */
export async function unreadTotal(user: User) {
	const list = await listChats(user);
	return list.filter((c) => !c.muted || c.mentioned).reduce((n, c) => n + c.unread, 0);
}

async function mutedChats(userId: number, chatIds: number[]) {
	if (chatIds.length === 0) return new Set<number>();
	const rows = await db
		.select()
		.from(chatMutes)
		.where(and(eq(chatMutes.userId, userId), inArray(chatMutes.chatId, chatIds)));
	const t = Date.now();
	return new Set(rows.filter((r) => !r.until || r.until.getTime() > t).map((r) => r.chatId));
}

export async function isMuted(userId: number, chatId: number) {
	return (await mutedChats(userId, [chatId])).has(chatId);
}

/** Titel und Untertitel für den Kopf des Chatfensters. */
export async function chatHeader(chat: Chat, user: User) {
	if (chat.kind === 'help') return { title: HELP_TITLE, person: null, themeId: null };
	if (chat.kind === 'theme') {
		const [theme] = await db.select().from(themes).where(eq(themes.id, chat.themeId!));
		return { title: theme?.title ?? 'Thema', person: null, themeId: chat.themeId };
	}
	const [other] = await db
		.select({ id: users.id, name: users.name })
		.from(chatMembers)
		.innerJoin(users, eq(chatMembers.userId, users.id))
		.where(and(eq(chatMembers.chatId, chat.id), ne(chatMembers.userId, user.id)));
	return { title: other?.name ?? 'Unbekannt', person: other ?? null, themeId: null };
}

// --------------------------------------------------------------- Nachrichten laden

/** Nachrichten eines Chats, die neuesten `PAGE`, bzw. die davor (`before`). Älteste zuerst. */
export async function loadMessages(chatId: number, before?: number) {
	const rows = await db
		.select({ m: messages, name: users.name, role: users.role })
		.from(messages)
		.innerJoin(users, eq(messages.authorId, users.id))
		.where(and(eq(messages.chatId, chatId), before ? lt(messages.id, before) : undefined))
		.orderBy(desc(messages.id))
		.limit(PAGE + 1);
	const more = rows.length > PAGE;
	const list = await toDto(rows.slice(0, PAGE).reverse());
	return { messages: list, more };
}

type Row = { m: typeof messages.$inferSelect; name: string; role: string };

async function toDto(rows: Row[]): Promise<ChatMessage[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.m.id);
	const reactions = await db
		.select({
			messageId: messageReactions.messageId,
			emoji: messageReactions.emoji,
			id: users.id,
			name: users.name
		})
		.from(messageReactions)
		.innerJoin(users, eq(messageReactions.userId, users.id))
		.where(inArray(messageReactions.messageId, ids));
	const mentions = await db
		.select({ messageId: messageMentions.messageId, id: users.id, name: users.name })
		.from(messageMentions)
		.innerJoin(users, eq(messageMentions.userId, users.id))
		.where(inArray(messageMentions.messageId, ids));
	const replyIds = [...new Set(rows.map((r) => r.m.replyToId).filter((id): id is number => !!id))];
	const replies = replyIds.length
		? await db
				.select({
					id: messages.id,
					body: messages.body,
					deleted: messages.deletedAt,
					name: users.name
				})
				.from(messages)
				.innerJoin(users, eq(messages.authorId, users.id))
				.where(inArray(messages.id, replyIds))
		: [];

	return rows.map(({ m, name, role }) => {
		const reply = m.replyToId ? replies.find((r) => r.id === m.replyToId) : undefined;
		const grouped = new Map<string, { id: number; name: string }[]>();
		for (const r of reactions.filter((x) => x.messageId === m.id)) {
			grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), { id: r.id, name: r.name }]);
		}
		return {
			id: m.id,
			chatId: m.chatId,
			author: { id: m.authorId, name, isAdmin: role === 'admin' },
			body: m.deletedAt ? '' : m.body,
			deleted: !!m.deletedAt,
			createdAt: m.createdAt,
			replyTo: !m.replyToId
				? null
				: reply && !reply.deleted
					? { id: reply.id, authorName: reply.name, excerpt: chatExcerpt(reply.body, 120) }
					: { id: m.replyToId, missing: true as const },
			reactions: [...grouped.entries()]
				.map(([emoji, who]) => ({ emoji, users: who }))
				.sort((a, b) => b.users.length - a.users.length),
			mentions: m.deletedAt
				? []
				: mentions.filter((x) => x.messageId === m.id).map((x) => ({ id: x.id, name: x.name }))
		};
	});
}

async function loadOne(id: number) {
	const rows = await db
		.select({ m: messages, name: users.name, role: users.role })
		.from(messages)
		.innerJoin(users, eq(messages.authorId, users.id))
		.where(eq(messages.id, id));
	return (await toDto(rows))[0] ?? null;
}

// --------------------------------------------------------------- Schreiben

/** Wie lange die Nachrichten dieser Person bleiben (Tage). */
export async function retentionFor(user: Pick<User, 'chatRetentionDays'>) {
	const adminDays = adminRetention((await getSettings()).chatRetentionDays);
	return { adminDays, ownDays: effectiveRetention(adminDays, user.chatRetentionDays) };
}

/** Bremse gegen Spam: höchstens 20 Nachrichten pro Minute und Person. */
const recent = new Map<number, number[]>();
function rateLimit(userId: number) {
	const t = Date.now();
	const list = (recent.get(userId) ?? []).filter((x) => t - x < 60_000);
	if (list.length >= 20)
		throw new UserError('Bitte etwas langsamer – höchstens 20 Nachrichten pro Minute.', 429);
	list.push(t);
	recent.set(userId, list);
}

export async function sendMessage(
	chat: Chat,
	author: User,
	input: { body: string; replyToId: number | null; mentionIds: number[] }
) {
	const body = input.body.trim();
	if (!body) throw new UserError('Die Nachricht ist leer.');
	if (body.length > MAX_MESSAGE_LENGTH)
		throw new UserError(`Höchstens ${MAX_MESSAGE_LENGTH} Zeichen.`);
	rateLimit(author.id);

	// Zitat nur aus demselben Chat
	let replyToId: number | null = null;
	if (input.replyToId) {
		const [r] = await db
			.select({ id: messages.id, authorId: messages.authorId })
			.from(messages)
			.where(and(eq(messages.id, input.replyToId), eq(messages.chatId, chat.id)));
		replyToId = r?.id ?? null;
	}

	// Erwähnen kann man nur Mitglieder, und nur wenn @Name im Text steht
	const people = await chatPeople(chat);
	const mentioned = mentionedIn(
		body,
		people.filter((p) => input.mentionIds.includes(p.id) && p.id !== author.id)
	);

	const { ownDays } = await retentionFor(author);
	const sentAt = new Date();
	const [row] = await db
		.insert(messages)
		.values({
			chatId: chat.id,
			authorId: author.id,
			body,
			replyToId,
			createdAt: sentAt,
			expiresAt: expiresAt(sentAt, ownDays)
		})
		.returning({ id: messages.id });
	if (mentioned.length) {
		await db
			.insert(messageMentions)
			.values(mentioned.map((p) => ({ messageId: row.id, userId: p.id })));
	}
	// Eigene Nachricht gilt als gelesen
	await markRead(chat.id, author.id, row.id);

	const message = (await loadOne(row.id))!;
	publish(
		people.map((p) => p.id),
		{ type: 'message', chatId: chat.id, message }
	);
	void notify(chat, author, message, people, replyToId).catch((e) =>
		console.error('Chat-Push:', e)
	);
	return message;
}

/** Push an alle, die es laut ihren Einstellungen wollen und den Chat nicht gerade offen haben. */
async function notify(
	chat: Chat,
	author: User,
	message: ChatMessage,
	people: Awaited<ReturnType<typeof chatPeople>>,
	replyToId: number | null
) {
	const [replied] = replyToId
		? await db
				.select({ authorId: messages.authorId })
				.from(messages)
				.where(eq(messages.id, replyToId))
		: [];
	const quiet = isQuietHour(zurichParts(new Date()).hour);
	const header = await chatHeader(chat, author);
	for (const p of people) {
		if (p.id === author.id || isViewing(p.id, chat.id)) continue;
		const reason = pushReason({
			kind: chat.kind,
			prefs: resolveChatNotify(p.chatNotify),
			mentioned: message.mentions.some((m) => m.id === p.id),
			repliedTo: replied?.authorId === p.id,
			isAdmin: p.role === 'admin',
			muted: await isMuted(p.id, chat.id)
		});
		if (!reason || (quiet && !urgentReason(reason))) continue;

		const unread = (await unreadCounts({ id: p.id } as User, [chat.id])).get(chat.id)?.count ?? 1;
		const first = author.name.split(' ')[0];
		const text = chatExcerpt(message.body, 140);
		const title = chat.kind === 'direct' ? author.name : header.title;
		const lead =
			reason === 'mention'
				? `${first} hat dich erwähnt: `
				: reason === 'reply'
					? `${first} antwortet dir: `
					: chat.kind === 'direct'
						? ''
						: `${first}: `;
		await sendPush(p.id, {
			title: unread > 1 ? `${title} · ${unread} neue Nachrichten` : title,
			body: `${lead}${text}`,
			url: `/chat/${chat.id}`,
			// Pro Chat ersetzt die neue Mitteilung die alte
			tag: `chat-${chat.id}`
		}).catch(() => {});
	}
}

// --------------------------------------------------------------- Reaktionen, Löschen, Gelesen

async function messageInChat(messageId: number, user: User) {
	const [m] = Number.isInteger(messageId)
		? await db.select().from(messages).where(eq(messages.id, messageId))
		: [];
	if (!m) error(404);
	const { chat, write } = await requireChat(m.chatId, user);
	return { m, chat, write };
}

async function broadcastUpdate(chat: Chat, messageId: number) {
	const message = await loadOne(messageId);
	const people = await chatPeople(chat);
	publish(
		people.map((p) => p.id),
		{ type: 'update', chatId: chat.id, message }
	);
	return message;
}

/** Reaktion setzen, ändern oder (emoji = null bzw. gleiches Emoji) entfernen. */
export async function react(messageId: number, user: User, emoji: string | null) {
	const { m, chat, write } = await messageInChat(messageId, user);
	if (!write || m.deletedAt) throw new UserError('Hier kannst du nicht reagieren.', 403);
	if (emoji && (emoji.length > 16 || /[\s<>]/.test(emoji)))
		throw new UserError('Ungültige Reaktion.');
	const [current] = await db
		.select()
		.from(messageReactions)
		.where(and(eq(messageReactions.messageId, m.id), eq(messageReactions.userId, user.id)));
	if (!emoji || current?.emoji === emoji) {
		await db
			.delete(messageReactions)
			.where(and(eq(messageReactions.messageId, m.id), eq(messageReactions.userId, user.id)));
	} else {
		await db
			.insert(messageReactions)
			.values({ messageId: m.id, userId: user.id, emoji })
			.onConflictDoUpdate({
				target: [messageReactions.messageId, messageReactions.userId],
				set: { emoji }
			});
	}
	return broadcastUpdate(chat, m.id);
}

/** Löschen: eigene Nachrichten, Admins zusätzlich in Themen- und Hilfe-Chats. */
export async function deleteMessage(messageId: number, user: User) {
	const { m, chat } = await messageInChat(messageId, user);
	const moderator = user.role === 'admin' && chat.kind !== 'direct';
	if (m.authorId !== user.id && !moderator)
		throw new UserError('Das darfst du nicht löschen.', 403);
	await db.transaction(async (tx) => {
		await tx.update(messages).set({ deletedAt: new Date(), body: '' }).where(eq(messages.id, m.id));
		await tx.delete(messageReactions).where(eq(messageReactions.messageId, m.id));
		await tx.delete(messageMentions).where(eq(messageMentions.messageId, m.id));
	});
	return broadcastUpdate(chat, m.id);
}

export async function markRead(chatId: number, userId: number, lastId: number) {
	await db
		.insert(chatReads)
		.values({ chatId, userId, lastReadId: lastId })
		.onConflictDoUpdate({
			target: [chatReads.chatId, chatReads.userId],
			set: { lastReadId: sql`greatest(${chatReads.lastReadId}, ${lastId})` }
		});
	publish([userId], { type: 'unread' });
}

export async function lastReadId(chatId: number, userId: number) {
	const [r] = await db
		.select({ id: chatReads.lastReadId })
		.from(chatReads)
		.where(and(eq(chatReads.chatId, chatId), eq(chatReads.userId, userId)));
	return r?.id ?? 0;
}

/** Stummschalten: Stunden (z.B. 8, 168), null = immer, 0 = wieder einschalten. */
export async function setMute(chatId: number, userId: number, hours: number | null) {
	if (hours === 0) {
		await db
			.delete(chatMutes)
			.where(and(eq(chatMutes.chatId, chatId), eq(chatMutes.userId, userId)));
		return;
	}
	const until = hours ? new Date(Date.now() + hours * 3_600_000) : null;
	await db
		.insert(chatMutes)
		.values({ chatId, userId, until })
		.onConflictDoUpdate({ target: [chatMutes.chatId, chatMutes.userId], set: { until } });
}

// --------------------------------------------------------------- Aufbewahrung

/** Abgelaufene Nachrichten endgültig löschen (samt Reaktionen und Erwähnungen). */
export async function purgeExpired(t = new Date()) {
	const gone = await db
		.delete(messages)
		.where(lt(messages.expiresAt, t))
		.returning({ id: messages.id });
	return gone.length;
}

/**
 * Neue Vorgabe des Admins: Kürzer gilt sofort auch für bestehende Nachrichten,
 * länger nur für neue.
 */
export async function applyAdminRetention(days: number) {
	await db.update(messages).set({
		expiresAt: sql`least(${messages.expiresAt}, ${messages.createdAt} + make_interval(days => ${days}))`
	});
}

/** Eigene Einstellung verkürzt: auch die bisherigen eigenen Nachrichten. */
export async function applyUserRetention(userId: number, days: number) {
	await db
		.update(messages)
		.set({
			expiresAt: sql`least(${messages.expiresAt}, ${messages.createdAt} + make_interval(days => ${days}))`
		})
		.where(eq(messages.authorId, userId));
}

// --------------------------------------------------------------- Erwähnungen für «Heute»

/** Erwähnungen der letzten Tage, noch ungelesen. */
export async function recentMentions(user: User, since: Date) {
	return db
		.select({
			messageId: messages.id,
			chatId: messages.chatId,
			body: messages.body,
			at: messages.createdAt,
			author: users.name,
			kind: chats.kind,
			themeId: chats.themeId
		})
		.from(messageMentions)
		.innerJoin(messages, eq(messageMentions.messageId, messages.id))
		.innerJoin(chats, eq(messages.chatId, chats.id))
		.innerJoin(users, eq(messages.authorId, users.id))
		.leftJoin(chatReads, and(eq(chatReads.chatId, messages.chatId), eq(chatReads.userId, user.id)))
		.where(
			and(
				eq(messageMentions.userId, user.id),
				gt(messages.createdAt, since),
				isNull(messages.deletedAt),
				or(isNull(chatReads.lastReadId), gt(messages.id, chatReads.lastReadId))
			)
		)
		.orderBy(desc(messages.id))
		.limit(10);
}
