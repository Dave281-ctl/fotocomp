/**
 * Erinnerungen per Mail und Push. Läuft alle 5 Minuten und prüft, ob ein Ereignis
 * eingetreten ist (Bewertung offen, Resultat, Wochenbewertung, Feedback-Runde,
 * neues Feedback).
 *
 * Alle Ereignisse eines Durchlaufs werden pro Benutzer zu **einer** Mail und
 * **einer** Push-Mitteilung zusammengefasst – je nach seinen Einstellungen
 * (Profil → Mitteilungen). Mails kommen höchstens alle 30 Minuten; was in dieser
 * Zeit anfällt, kommt beim nächsten Durchlauf gesammelt. Push wird nachts
 * (22–07 Uhr) zurückgehalten. Über `notifications_sent` wird jedes Ereignis pro
 * Benutzer und Kanal nur einmal gemeldet, auch nach einem Neustart.
 */
import { and, count, desc, eq, gt, gte, inArray, isNull, like, ne } from 'drizzle-orm';
import {
	eventSection,
	excerpt,
	mailSubject,
	notifyKind,
	pickHighlight,
	pushText,
	uploadStreak,
	type HighlightData,
	type MailEvent
} from '../mail-texts.ts';
import {
	DAY_START_HOUR,
	VOTING_START_HOUR,
	addDays,
	at,
	formatTime,
	gameDay,
	isWeeklyVoteDay,
	lastRevealedDay,
	themePhase,
	zurichParts
} from '../schedule.ts';
import { isQuietHour, resolvePrefs, type NotifyPrefs } from '../notify.ts';
import { config } from './config.ts';
import { db } from './db.ts';
import { getParticipation } from './feedback.ts';
import { getWinners } from './gallery.ts';
import { sendMail } from './mail.ts';
import { findPhoto } from './photos.ts';
import { sendPush, usersWithPush } from './push.ts';
import {
	feedback,
	feedbackRounds,
	notificationsSent,
	photos,
	themeMembers,
	themes,
	users,
	votes
} from './schema.ts';
import { getMemberships, getPhase } from './themes.ts';
import { now } from './time.ts';

const INTERVAL = 5 * 60 * 1000;
/** Ereignisse, die länger zurückliegen (z.B. nach Ausfall), werden nicht mehr gemeldet. */
const MAX_DELAY = 2 * 60 * 60 * 1000;
/** Push darf etwas später kommen, damit das Resultat von 05:00 nach der Nachtruhe noch ankommt. */
const MAX_DELAY_PUSH = 3 * 60 * 60 * 1000;
/** Mindestabstand zwischen zwei Erinnerungsmails an dieselbe Person. */
const MIN_GAP = 30 * 60 * 1000;
/** So weit zurück wird nach Feedback und Erfolgen für die Highlight-Zeile gesucht. */
const HIGHLIGHT_DAYS = 14;

let timer: ReturnType<typeof setInterval> | undefined;

export function startJobs() {
	if (timer) return;
	const run = () => runNotifications(now()).catch((e) => console.error('Benachrichtigungen:', e));
	timer = setInterval(run, INTERVAL);
	setTimeout(run, 10_000).unref();
}

export function stopJobs() {
	clearInterval(timer);
	timer = undefined;
}

// --------------------------------------------------------------- Merker

/** Merkt sich einen Schlüssel; liefert false, wenn er schon existierte. */
async function claim(key: string, t: Date) {
	const rows = await db
		.insert(notificationsSent)
		.values({ key, sentAt: t })
		.onConflictDoNothing()
		.returning({ key: notificationsSent.key });
	return rows.length > 0;
}

async function isClaimed(key: string) {
	const [row] = await db
		.select({ key: notificationsSent.key })
		.from(notificationsSent)
		.where(eq(notificationsSent.key, key));
	return !!row;
}

/** Hat die Person in den letzten 30 Minuten schon eine Erinnerung bekommen? */
async function mailedRecently(userId: number, t: Date) {
	const [{ n }] = await db
		.select({ n: count() })
		.from(notificationsSent)
		.where(
			and(
				like(notificationsSent.key, `mail:${userId}:%`),
				gt(notificationsSent.sentAt, new Date(t.getTime() - MIN_GAP))
			)
		);
	return n > 0;
}

// --------------------------------------------------------------- Ereignisse

interface ThemeEvent {
	key: string;
	/** Zeitpunkt des Ereignisses */
	at: Date;
	themeId: number;
	event: MailEvent;
	path: string;
	/** Nur an diese Personen (z.B. Teilnehmende einer Feedback-Runde). */
	filter?: (userId: number) => Promise<boolean>;
	/** Bewertung: Besitzer der Fotos, damit das eigene Foto nicht mitzählt. */
	owners?: number[];
	/** Nur an diese eine Person, unabhängig vom Thema (neues Feedback). */
	userId?: number;
	/** Neues Feedback: damit es nicht nochmals in der Highlight-Zeile auftaucht. */
	feedbackId?: number;
}

const age = (event: Date, t: Date) => t.getTime() - event.getTime();
const recent = (event: Date, t: Date, max = MAX_DELAY_PUSH) => t >= event && age(event, t) < max;

async function dayPhotoOwners(themeId: number, day: string) {
	const rows = await db
		.select({ userId: photos.userId })
		.from(photos)
		.where(and(eq(photos.themeId, themeId), eq(photos.day, day)));
	return rows.map((r) => r.userId);
}

/** Alle Ereignisse, die gerade eingetreten sind. */
async function collectEvents(t: Date): Promise<ThemeEvent[]> {
	const events: ThemeEvent[] = [];
	const open = await db.select().from(themes).where(isNull(themes.endedAt));
	for (const theme of open) {
		const phase = themePhase(theme, t);
		if (phase.kind === 'ended' || phase.kind === 'upcoming') continue;
		const today = gameDay(t);
		const path = `/?thema=${theme.id}`;
		const base = { themeId: theme.id, path };

		// 20:00 – Bewertung offen (nur wenn es etwas zu bewerten gibt)
		if (phase.kind === 'voting' && recent(at(today, VOTING_START_HOUR), t)) {
			const owners = await dayPhotoOwners(theme.id, today);
			if (owners.length > 1) {
				events.push({
					...base,
					at: at(today, VOTING_START_HOUR),
					key: `voting:${theme.id}:${today}`,
					event: { kind: 'voting', theme: theme.title, photos: owners.length },
					owners
				});
			}
		}

		// 05:00 – Resultat enthüllt bzw. Wochenbewertung beginnt
		if (recent(at(today, DAY_START_HOUR), t)) {
			const morning = { ...base, at: at(today, DAY_START_HOUR) };
			const yesterday = addDays(today, -1);
			const resultDay = lastRevealedDay(theme, t);
			if (phase.kind === 'weekly') {
				events.push({
					...morning,
					key: `weekly:${theme.id}:${today}`,
					event: { kind: 'weekly', theme: theme.title }
				});
			} else if (isWeeklyVoteDay(theme, yesterday)) {
				events.push({
					...morning,
					key: `weeklyResult:${theme.id}:${yesterday}`,
					event: { kind: 'weeklyResult', theme: theme.title }
				});
			} else if (resultDay && (await dayPhotoOwners(theme.id, resultDay)).length > 0) {
				events.push({
					...morning,
					key: `result:${theme.id}:${resultDay}`,
					event: { kind: 'result', theme: theme.title, day: resultDay }
				});
			}
		}
	}

	// Feedback-Runden: Ankündigung beim Start
	const rounds = await db
		.select({ round: feedbackRounds, theme: themes })
		.from(feedbackRounds)
		.innerJoin(themes, eq(feedbackRounds.themeId, themes.id))
		.where(gt(feedbackRounds.endsAt, t));
	for (const { round, theme } of rounds) {
		if (!recent(round.startsAt, t)) continue;
		events.push({
			key: `feedback:${round.id}`,
			at: round.startsAt,
			themeId: theme.id,
			path: `/feedback?thema=${theme.id}`,
			event: { kind: 'feedback', theme: theme.title },
			filter: async (userId) => (await getParticipation(round, userId)) !== false
		});
	}

	// Neues Feedback: nur an den Fotografen, mit Namen des Verfassers
	const fresh = await db
		.select({
			id: feedback.id,
			at: feedback.createdAt,
			body: feedback.body,
			author: users.name,
			authorId: feedback.authorId,
			ownerId: photos.userId,
			photoId: photos.id,
			themeId: photos.themeId,
			theme: themes.title
		})
		.from(feedback)
		.innerJoin(photos, eq(feedback.photoId, photos.id))
		.innerJoin(themes, eq(photos.themeId, themes.id))
		.innerJoin(users, eq(feedback.authorId, users.id))
		.where(gt(feedback.createdAt, new Date(t.getTime() - MAX_DELAY_PUSH)));
	for (const f of fresh) {
		if (f.authorId === f.ownerId) continue;
		events.push({
			key: `feedbackNew:${f.id}`,
			at: f.at,
			themeId: f.themeId,
			path: `/foto/${f.photoId}`,
			userId: f.ownerId,
			feedbackId: f.id,
			event: { kind: 'feedbackNew', theme: f.theme, author: f.author, excerpt: excerpt(f.body) }
		});
	}
	return events;
}

const personColumns = {
	id: users.id,
	email: users.email,
	name: users.name,
	notify: users.notify,
	emailNotifications: users.emailNotifications
};

async function recipients(themeIds: number[]) {
	if (themeIds.length === 0) return [];
	return db
		.select({ themeId: themeMembers.themeId, ...personColumns })
		.from(themeMembers)
		.innerJoin(users, eq(themeMembers.userId, users.id))
		.where(
			and(
				inArray(themeMembers.themeId, themeIds),
				isNull(themeMembers.leftAt),
				eq(users.disabled, false)
			)
		);
}

async function directRecipients(userIds: number[]) {
	if (userIds.length === 0) return [];
	return db
		.select(personColumns)
		.from(users)
		.where(and(inArray(users.id, userIds), eq(users.disabled, false)));
}

// --------------------------------------------------------------- Highlight

type Winners = Awaited<ReturnType<typeof getWinners>>;

/**
 * Daten für die persönliche Zeile: neuestes noch nicht erwähntes Feedback,
 * neuester noch nicht erwähnter Erfolg und die aktuelle Serie.
 */
async function highlightData(userId: number, t: Date, winners: Winners) {
	const today = gameDay(t);
	const since = addDays(today, -HIGHLIGHT_DAYS);
	const data: HighlightData = {};
	const claims: Partial<Record<'feedback' | 'win' | 'streak', string>> = {};

	const received = await db
		.select({
			id: feedback.id,
			body: feedback.body,
			author: users.name,
			day: photos.day,
			photoId: photos.id
		})
		.from(feedback)
		.innerJoin(photos, eq(feedback.photoId, photos.id))
		.innerJoin(users, eq(feedback.authorId, users.id))
		.where(
			and(
				eq(photos.userId, userId),
				ne(feedback.authorId, userId),
				gt(feedback.createdAt, new Date(t.getTime() - HIGHLIGHT_DAYS * 86_400_000))
			)
		)
		.orderBy(desc(feedback.createdAt))
		.limit(5);
	for (const f of received) {
		if (await isClaimed(`hl:feedback:${f.id}`)) continue;
		data.feedback = {
			author: f.author,
			day: f.day,
			excerpt: excerpt(f.body),
			photoId: f.photoId
		};
		claims.feedback = `hl:feedback:${f.id}`;
		break;
	}

	const mine = await db
		.select({ id: photos.id, day: photos.day, theme: themes.title })
		.from(photos)
		.innerJoin(themes, eq(photos.themeId, themes.id))
		.where(and(eq(photos.userId, userId), gte(photos.day, since)))
		.orderBy(desc(photos.day));
	for (const p of mine) {
		const badge = winners.get(p.id);
		if (!badge || (await isClaimed(`hl:win:${p.id}`))) continue;
		const stars = (
			await db.select({ stars: votes.stars }).from(votes).where(eq(votes.photoId, p.id))
		).map((v) => v.stars);
		data.win = {
			kind: badge,
			day: p.day,
			theme: p.theme,
			average: stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : null
		};
		claims.win = `hl:win:${p.id}`;
		break;
	}

	const streakKey = `hl:streak:${userId}:${today}`;
	if (!(await isClaimed(streakKey))) {
		data.streak = uploadStreak(
			mine.map((p) => p.day),
			today
		);
		claims.streak = streakKey;
	}
	return { data, claims };
}

// --------------------------------------------------------------- Versand

/** Upload-Hinweis für die Morgenmail: alle Themen, in denen heute noch ein Foto fehlt. */
async function uploadEvent(userId: number, t: Date) {
	const open: { id: number; title: string; endsAt: Date }[] = [];
	for (const { theme } of await getMemberships(userId)) {
		const phase = await getPhase(theme, t);
		if (phase.kind !== 'upload' || (await findPhoto(userId, theme.id, phase.day))) continue;
		open.push({ id: theme.id, title: theme.title, endsAt: phase.endsAt });
	}
	if (open.length === 0) return [];
	const event: MailEvent = {
		kind: 'upload',
		themes: open.map((o) => o.title),
		until: formatTime(open[0].endsAt)
	};
	return [{ event, path: `/?thema=${open[0].id}` }];
}

interface Person {
	email: string;
	name: string;
	prefs: NotifyPrefs;
	items: ThemeEvent[];
}

type Item = { event: MailEvent; path: string };

/** Ereignisse für eine Person aufbereiten (bei der Bewertung zählt das eigene Foto nicht). */
const personal = (events: ThemeEvent[], userId: number): Item[] =>
	events.map((e) => ({
		event:
			e.event.kind === 'voting'
				? { ...e.event, photos: e.owners!.filter((id) => id !== userId).length }
				: e.event,
		path: e.path
	}));

const isMorning = (items: ThemeEvent[]) =>
	items.some((e) => ['result', 'weekly', 'weeklyResult'].includes(e.event.kind));

export async function runNotifications(t: Date) {
	const events = await collectEvents(t);
	if (events.length === 0) return;

	// Ereignisse pro Person sammeln
	const people = new Map<number, Person>();
	const add = (r: Awaited<ReturnType<typeof directRecipients>>[number], e: ThemeEvent) => {
		const person = people.get(r.id) ?? {
			email: r.email,
			name: r.name,
			prefs: resolvePrefs(r.notify, r.emailNotifications),
			items: []
		};
		person.items.push(e);
		people.set(r.id, person);
	};
	const themeEvents = events.filter((e) => e.userId === undefined);
	for (const r of await recipients([...new Set(themeEvents.map((e) => e.themeId))])) {
		for (const e of themeEvents.filter((e) => e.themeId === r.themeId)) {
			if (e.filter && !(await e.filter(r.id))) continue;
			if (e.owners && e.owners.filter((id) => id !== r.id).length === 0) continue;
			add(r, e);
		}
	}
	const direct = events.filter((e) => e.userId !== undefined);
	for (const r of await directRecipients([...new Set(direct.map((e) => e.userId!))])) {
		for (const e of direct.filter((e) => e.userId === r.id)) add(r, e);
	}

	const withPush = await usersWithPush([...people.keys()]);
	const quiet = isQuietHour(zurichParts(t).hour);
	let winners: Winners | undefined;

	for (const [userId, person] of people) {
		const wants = (e: ThemeEvent, channel: 'mail' | 'push') =>
			person.prefs[notifyKind(e.event)][channel];

		// ---- Push: sofort (ausser nachts), eine Mitteilung pro Durchlauf
		if (withPush.has(userId) && !quiet) {
			const fresh: ThemeEvent[] = [];
			for (const e of person.items.filter((e) => wants(e, 'push'))) {
				if (await claim(`push:${e.key}:${userId}`, t)) fresh.push(e);
			}
			if (fresh.length > 0) {
				const items = personal(fresh, userId);
				if (isMorning(fresh) && person.prefs.upload.push) {
					items.push(...(await uploadEvent(userId, t)));
				}
				const { title, body } = pushText(items.map((i) => i.event));
				await sendPush(userId, { title, body, url: items[0].path, tag: 'fotocomp' }).catch((e) =>
					console.error('Push:', e)
				);
			}
		}

		// ---- Mail: Sammelmail, höchstens alle 30 Minuten
		const forMail = person.items.filter((e) => wants(e, 'mail') && age(e.at, t) < MAX_DELAY);
		if (forMail.length === 0 || (await mailedRecently(userId, t))) continue;

		const fresh: ThemeEvent[] = [];
		for (const e of forMail) {
			if (await claim(`${e.key}:${userId}`, t)) fresh.push(e);
		}
		if (fresh.length === 0) continue;
		await claim(`mail:${userId}:${t.toISOString()}`, t);
		// Was als neues Feedback gemeldet wird, nicht nochmals als Highlight
		for (const e of fresh) if (e.feedbackId) await claim(`hl:feedback:${e.feedbackId}`, t);

		const kinds = new Set(fresh.map((e) => e.event.kind));
		const morning = isMorning(fresh);
		const slot = kinds.has('voting') ? 'evening' : morning ? 'morning' : 'other';

		const items = personal(fresh, userId);
		if (morning && person.prefs.upload.mail) items.push(...(await uploadEvent(userId, t)));

		winners ??= await getWinners(addDays(gameDay(t), -1), t);
		const { data, claims } = await highlightData(userId, t, winners);
		const highlight = pickHighlight(data, slot, gameDay(t));
		const used = claims[highlight.kind as keyof typeof claims];
		if (used) await claim(used, t);

		await sendMail(person.email, {
			subject: mailSubject(items.map((i) => i.event)),
			paragraphs: [`Hallo ${person.name}`],
			highlight: {
				text: highlight.text,
				link: highlight.link && {
					label: highlight.link.label,
					url: `${config.origin}${highlight.link.path}`
				}
			},
			sections: items.map((i) => eventSection(i.event, `${config.origin}${i.path}`)),
			footer:
				'Welche Mitteilungen du per Mail oder Push bekommst, stellst du im Profil unter «Mitteilungen» ein.'
		}).catch(() => {}); // Fehler wird in sendMail protokolliert
	}
}
