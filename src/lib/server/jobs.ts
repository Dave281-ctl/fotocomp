/**
 * Erinnerungsmails. Läuft alle 5 Minuten und prüft, ob ein Ereignis eingetreten
 * ist (Bewertung offen, Resultat, Wochenbewertung, Feedback-Runde). Jede Mail
 * wird über `notifications_sent` nur einmal verschickt – auch nach einem Neustart.
 */
import { and, count, eq, gt, isNull } from 'drizzle-orm';
import {
	DAY_START_HOUR,
	VOTING_START_HOUR,
	addDays,
	at,
	formatDay,
	gameDay,
	isWeeklyVoteDay,
	lastRevealedDay,
	themePhase
} from '../schedule.ts';
import { config } from './config.ts';
import { db } from './db.ts';
import { getParticipation } from './feedback.ts';
import { sendMail } from './mail.ts';
import {
	feedbackRounds,
	notificationsSent,
	photos,
	themeMembers,
	themes,
	users,
	type Theme
} from './schema.ts';
import { now } from './time.ts';

const INTERVAL = 5 * 60 * 1000;
/** Ereignisse, die länger zurückliegen (z.B. nach Ausfall), werden nicht mehr gemeldet. */
const MAX_DELAY = 2 * 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | undefined;

export function startJobs() {
	if (timer) return;
	const run = () => runNotifications(now()).catch((e) => console.error('Benachrichtigungen:', e));
	timer = setInterval(run, INTERVAL);
	setTimeout(run, 10_000);
}

/** Merkt sich einen Schlüssel; liefert false, wenn er schon existierte. */
async function claim(key: string) {
	const rows = await db
		.insert(notificationsSent)
		.values({ key })
		.onConflictDoNothing()
		.returning({ key: notificationsSent.key });
	return rows.length > 0;
}

const recent = (event: Date, t: Date) => t >= event && t.getTime() - event.getTime() < MAX_DELAY;

async function recipients(themeId: number) {
	return db
		.select({ id: users.id, email: users.email, name: users.name })
		.from(themeMembers)
		.innerJoin(users, eq(themeMembers.userId, users.id))
		.where(
			and(
				eq(themeMembers.themeId, themeId),
				isNull(themeMembers.leftAt),
				eq(users.emailNotifications, true),
				eq(users.disabled, false)
			)
		);
}

async function photoCount(themeId: number, day: string) {
	const [{ n }] = await db
		.select({ n: count() })
		.from(photos)
		.where(and(eq(photos.themeId, themeId), eq(photos.day, day)));
	return n;
}

async function notify(
	theme: Theme,
	key: string,
	subject: string,
	text: string,
	button: string,
	path = '/',
	filter?: (userId: number) => Promise<boolean>
) {
	if (!(await claim(key))) return;
	for (const r of await recipients(theme.id)) {
		if (filter && !(await filter(r.id))) continue;
		await sendMail(r.email, {
			subject,
			paragraphs: [`Hallo ${r.name}`, text],
			button: { label: button, url: `${config.origin}${path}` },
			footer: 'Erinnerungen kannst du in deinem Profil abschalten.'
		}).catch((e) => console.error(`Mail an ${r.email} fehlgeschlagen:`, e));
	}
}

export async function runNotifications(t: Date) {
	const open = await db.select().from(themes).where(isNull(themes.endedAt));
	for (const theme of open) {
		const phase = themePhase(theme, t);
		if (phase.kind === 'ended' || phase.kind === 'upcoming') continue;
		const today = gameDay(t);

		// 20:00 – Bewertung offen
		if (phase.kind === 'voting' && recent(at(today, VOTING_START_HOUR), t)) {
			if ((await photoCount(theme.id, today)) > 1) {
				await notify(
					theme,
					`voting:${theme.id}:${today}`,
					`${theme.title}: Jetzt bewerten`,
					'Die Fotos von heute sind da. Du kannst sie bis morgen um 05:00 Uhr bewerten.',
					'Fotos bewerten'
				);
			}
		}

		// 05:00 – Resultat enthüllt bzw. Wochenbewertung beginnt
		if (recent(at(today, DAY_START_HOUR), t)) {
			const resultDay = lastRevealedDay(theme, t);
			if (phase.kind === 'weekly') {
				await notify(
					theme,
					`weekly:${theme.id}:${today}`,
					`${theme.title}: Wähle das Wochenfoto`,
					'Heute wird das Wochenfoto gekürt. Wähle deine drei Favoriten der Woche.',
					'Wochenfoto wählen'
				);
			} else if (isWeeklyVoteDay(theme, addDays(today, -1))) {
				await notify(
					theme,
					`weeklyResult:${theme.id}:${addDays(today, -1)}`,
					`${theme.title}: Das Wochenfoto ist gekürt`,
					'Die Wochenbewertung ist enthüllt. Schau dir das Wochenfoto und die Rangliste an.',
					'Wochenfoto ansehen'
				);
			} else if (resultDay && (await photoCount(theme.id, resultDay)) > 0) {
				await notify(
					theme,
					`result:${theme.id}:${resultDay}`,
					`${theme.title}: Das Resultat ist da`,
					`Das Resultat von ${formatDay(resultDay)} ist enthüllt.`,
					'Resultat ansehen'
				);
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
		await notify(
			theme,
			`feedback:${round.id}`,
			`${theme.title}: Feedback-Runde`,
			'Eine Feedback-Runde hat begonnen. Gebt euch gegenseitig freundschaftliches Feedback zu den Fotos der letzten Woche.',
			'Zur Feedback-Runde',
			'/feedback',
			async (userId) => (await getParticipation(round, userId)) !== false
		);
	}
}
