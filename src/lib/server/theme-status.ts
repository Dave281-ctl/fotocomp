/**
 * Was ist in einem Thema zu tun, und was ist neu? Grundlage für «Heute»,
 * die Themenansicht und den Punkt in den Themen-Reitern – damit alle
 * dasselbe anzeigen.
 */
import { and, desc, eq, gt, ne } from 'drizzle-orm';
import { excerpt } from '../mail-texts.ts';
import {
	DAY_START_HOUR,
	addDays,
	at,
	formatDeadline,
	formatShortDay,
	formatWeekdayTime,
	formatWhen,
	lastRevealedDay,
	lastWeeklyVoteDay
} from '../schedule.ts';
import type { NewsItem, Task } from '../types.ts';
import { db } from './db.ts';
import { getCurrentRound, getParticipation, getRoundPhotos } from './feedback.ts';
import { getDayPhotos } from './gallery.ts';
import { findPhoto } from './photos.ts';
import { feedback, photos, users, type Theme, type User } from './schema.ts';
import { getMemberships, getPhase } from './themes.ts';
import { getMyPicks, getWeekPhotos, getWeeklyResult } from './weekly.ts';

/** So lange bleiben Neuigkeiten auf «Heute». */
export const NEWS_DAYS = 3;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Alle Aufgaben eines Themas, offene zuerst. Erledigte bleiben sichtbar (✓). */
export async function themeTasks(theme: Theme, user: User, t: Date): Promise<Task[]> {
	const tasks: Task[] = [];
	const base = `/themen/${theme.id}`;
	const phase = await getPhase(theme, t);

	if (phase.kind === 'upload') {
		const mine = await findPhoto(user.id, theme.id, phase.day);
		tasks.push({
			kind: 'upload',
			title: mine
				? 'Foto hochgeladen'
				: phase.early
					? 'Foto für morgen hochladen'
					: 'Foto hochladen',
			detail: mine
				? `ersetzen ${formatDeadline(phase.endsAt, t)}`
				: formatDeadline(phase.endsAt, t),
			done: !!mine,
			href: `${base}/hochladen`,
			due: phase.endsAt
		});
	}

	if (phase.kind === 'voting') {
		const toRate = (await getDayPhotos(theme.id, phase.day, user.id, t)).filter((p) => !p.isOwn);
		if (toRate.length) {
			const rated = toRate.filter((p) => p.myStars !== null).length;
			const done = rated === toRate.length;
			tasks.push({
				kind: 'vote',
				title: done ? 'Alle Fotos bewertet' : 'Fotos bewerten',
				detail: `${rated} von ${toRate.length} · ${formatDeadline(phase.endsAt, t)}`,
				done,
				href: `/bewerten#thema-${theme.id}`,
				due: phase.endsAt
			});
		}
	}

	if (phase.kind === 'weekly') {
		const others = (await getWeekPhotos(theme.id, phase.day, user.id, t)).filter((p) => !p.isOwn);
		if (others.length) {
			const picks = await getMyPicks(theme.id, phase.day, user.id);
			tasks.push({
				kind: 'weekly',
				title: picks.length ? 'Wochenfoto gewählt' : 'Wochenfoto wählen',
				detail: `${picks.length} von 3 · ${formatDeadline(phase.endsAt, t)}`,
				done: picks.length > 0,
				href: `${base}/wochenfoto`,
				due: phase.endsAt
			});
		}
	}

	// Feedback-Runde: laufend oder in den nächsten 24 Stunden
	const round = phase.kind === 'ended' ? null : await getCurrentRound(theme, t);
	if (round && round.startsAt.getTime() - t.getTime() < 24 * 3_600_000) {
		const active = round.startsAt <= t;
		const participating = await getParticipation(round, user.id);
		const href = `${base}/feedback`;
		if (participating === null) {
			tasks.push({
				kind: 'feedback',
				title: 'Feedback-Runde: Machst du mit?',
				detail: active
					? formatDeadline(round.endsAt, t)
					: `startet ${formatWeekdayTime(round.startsAt)} Uhr`,
				done: false,
				href,
				due: active ? round.endsAt : round.startsAt
			});
		} else if (participating && active) {
			const { photos: roundPhotos } = await getRoundPhotos(round, user.id, t);
			const open = roundPhotos.filter((p) => !p.feedbackGiven).length;
			if (roundPhotos.length) {
				tasks.push({
					kind: 'feedback',
					title: open ? 'Feedback geben' : 'Feedback gegeben',
					detail: open
						? `${count(open, 'Foto wartet', 'Fotos warten')} · ${formatDeadline(round.endsAt, t)}`
						: `alle ${roundPhotos.length} Fotos`,
					done: open === 0,
					href,
					due: round.endsAt
				});
			}
		}
	}

	// Offene zuerst, nach Frist
	return tasks.sort(
		(a, b) => Number(a.done) - Number(b.done) || (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0)
	);
}

/** Neuigkeiten der letzten Tage: Resultate, Wochenfoto, Feedback an mich. Neueste zuerst. */
export async function themeNews(
	theme: Theme,
	user: User,
	t: Date,
	seenAt: Date | null
): Promise<NewsItem[]> {
	const since = new Date(t.getTime() - NEWS_DAYS * 86_400_000);
	const items: Omit<NewsItem, 'isNew' | 'when'>[] = [];
	const base = `/themen/${theme.id}`;

	// Tagesresultat
	const day = lastRevealedDay(theme, t);
	const revealedAt = day ? at(addDays(day, 1), DAY_START_HOUR) : null;
	if (day && revealedAt! >= since && revealedAt! <= t) {
		const dayPhotos = await getDayPhotos(theme.id, day, user.id, t);
		const ranked = dayPhotos.filter((p) => p.votes);
		const winner = ranked.find((p) => p.rank === 1);
		if (winner) {
			const mine = ranked.find((p) => p.isOwn);
			const unrated = !mine && dayPhotos.some((p) => p.isOwn);
			items.push({
				key: `result:${theme.id}:${day}`,
				kind: 'result',
				at: revealedAt!,
				title: winner.isOwn
					? `Du hast den ${formatShortDay(day)} gewonnen!`
					: `${winner.userName} gewinnt den ${formatShortDay(day)}`,
				text: mine
					? `Dein Foto: ${mine.rank}. von ${ranked.length} · ★ ${mine.average?.toFixed(1)}`
					: unrated
						? 'Dein Foto hat diesmal keine Stimmen bekommen'
						: `${count(ranked.length, 'Foto', 'Fotos')} bewertet`,
				photoId: winner.id,
				href: `${base}#tag-${day}`
			});
		}
	}

	// Wochenfoto
	const voteDay = lastWeeklyVoteDay(theme, t);
	const weekAt = voteDay ? at(addDays(voteDay, 1), DAY_START_HOUR) : null;
	if (voteDay && weekAt! >= since) {
		const result = await getWeeklyResult(theme.id, voteDay, user.id, t);
		const winner = result?.podium[0];
		if (winner) {
			items.push({
				key: `weekly:${theme.id}:${voteDay}`,
				kind: 'weekly',
				at: weekAt!,
				title: winner.isOwn ? 'Dein Foto ist das Wochenfoto!' : 'Das Wochenfoto ist gekürt',
				text: `${winner.userName} · ${count(winner.points, 'Punkt', 'Punkte')}`,
				photoId: winner.id,
				href: base
			});
		}
	}

	// Feedback zu meinen Fotos
	const received = await db
		.select({
			id: feedback.id,
			at: feedback.createdAt,
			body: feedback.body,
			author: users.name,
			photoId: photos.id
		})
		.from(feedback)
		.innerJoin(photos, eq(feedback.photoId, photos.id))
		.innerJoin(users, eq(feedback.authorId, users.id))
		.where(
			and(
				eq(photos.themeId, theme.id),
				eq(photos.userId, user.id),
				ne(feedback.authorId, user.id),
				gt(feedback.createdAt, since)
			)
		)
		.orderBy(desc(feedback.createdAt))
		.limit(5);
	for (const f of received) {
		items.push({
			key: `feedback:${f.id}`,
			kind: 'feedback',
			at: f.at,
			title: `${f.author} hat dir Feedback gegeben`,
			text: `«${excerpt(f.body, 90)}»`,
			photoId: f.photoId,
			href: `/foto/${f.photoId}`
		});
	}

	return items
		.sort((a, b) => b.at.getTime() - a.at.getTime())
		.map((item) => ({
			...item,
			when: formatWhen(item.at, t),
			isNew: !seenAt || item.at > seenAt
		}));
}

/** Offene Aufgaben über alle eigenen Themen (Zähler beim Menüpunkt «Heute»). */
export async function openTaskCount(user: User, t: Date) {
	const counts = await Promise.all(
		(await getMemberships(user.id)).map(
			async ({ theme }) => (await themeTasks(theme, user, t)).filter((task) => !task.done).length
		)
	);
	return counts.reduce((a, b) => a + b, 0);
}

/** Gibt es im Thema etwas Offenes? (Punkt in den Reitern) */
export async function hasOpenTask(theme: Theme, user: User, t: Date) {
	return (await themeTasks(theme, user, t)).some((task) => !task.done);
}
