/**
 * Zusätzliche Angaben für «Heute» im Design Ben-FINAL:
 * Titelbild (letzter Tagessieg), «wer hat schon» pro Thema und «Diese Woche».
 * Liest nur vorhandene Daten.
 */
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { addDays, gameDay, isoWeekday, lastRevealedDay, type Day } from '../schedule.ts';
import { db } from './db.ts';
import { decorate, getDayPhotos, photoColumns } from './gallery.ts';
import { photos, users, type Theme } from './schema.ts';
import { listMembers } from './themes.ts';

export interface HeroPhoto {
	photoId: number;
	themeTitle: string;
	userName: string;
	userId: number;
	day: Day;
	average: number;
	votes: number;
}

/** Der jüngste Tagessieg in den Themen des Users (für das grosse Titelbild). */
export async function latestWin(themes: Theme[], viewerId: number, now: Date) {
	const candidates = themes
		.map((theme) => ({ theme, day: lastRevealedDay(theme, now) }))
		.filter((c): c is { theme: Theme; day: Day } => c.day !== null)
		.sort((a, b) => b.day.localeCompare(a.day));

	for (const { theme, day } of candidates) {
		const winner = (await getDayPhotos(theme.id, day, viewerId, now)).find(
			(p) => p.rank === 1 && p.votes
		);
		if (winner?.userName && winner.userId) {
			return {
				photoId: winner.id,
				themeTitle: theme.title,
				userName: winner.userName,
				userId: winner.userId,
				day,
				average: winner.average ?? 0,
				votes: winner.votes ?? 0
			} satisfies HeroPhoto;
		}
	}
	return null;
}

export interface Uploaders {
	/** Wer für diesen Tag schon ein Foto hat (ohne den User selbst) */
	done: { id: number; name: string }[];
	/** Alle Teilnehmenden, inkl. User */
	total: number;
	mine: boolean;
}

/** Wer im Thema für `day` schon hochgeladen hat. Nur Namen, keine Fotos. */
export async function uploaders(themeId: number, day: Day, userId: number): Promise<Uploaders> {
	const members = await listMembers(themeId);
	const rows = await db
		.select({ userId: photos.userId })
		.from(photos)
		.where(
			and(
				eq(photos.themeId, themeId),
				eq(photos.day, day),
				inArray(
					photos.userId,
					members.map((m) => m.id)
				)
			)
		);
	const ids = new Set(rows.map((r) => r.userId));
	return {
		done: members.filter((m) => ids.has(m.id) && m.id !== userId),
		total: members.length,
		mine: ids.has(userId)
	};
}

export interface WeekStats {
	from: Day;
	to: Day;
	photos: number;
	wins: number;
	/** Durchschnitt der erhaltenen Sterne (enthüllte Tage), null ohne Stimmen */
	average: number | null;
	/** Mo–So: Sterneschnitt des Tages (0 = Foto ohne Resultat), null = kein Foto */
	days: { day: Day; label: string; value: number | null; isToday: boolean; future: boolean }[];
}

const LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Eigene Bilanz der laufenden Woche (Montag bis Sonntag), über alle Themen. */
export async function weekStats(userId: number, now: Date): Promise<WeekStats> {
	const today = gameDay(now);
	const from = addDays(today, 1 - isoWeekday(today));
	const to = addDays(from, 6);

	const rows = await db
		.select(photoColumns)
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.where(and(eq(photos.userId, userId), gte(photos.day, from), lte(photos.day, to)));
	const mine = await decorate(rows, userId, now);

	const rated = mine.filter((p) => p.votes);
	const average = rated.length
		? Math.round((rated.reduce((s, p) => s + (p.average ?? 0), 0) / rated.length) * 10) / 10
		: null;

	const days = LABELS.map((label, i) => {
		const day = addDays(from, i);
		const onDay = mine.filter((p) => p.day === day);
		const withVotes = onDay.filter((p) => p.votes);
		return {
			day,
			label,
			value: onDay.length
				? withVotes.length
					? withVotes.reduce((s, p) => s + (p.average ?? 0), 0) / withVotes.length
					: 0
				: null,
			isToday: day === today,
			future: day > today
		};
	});

	return {
		from,
		to,
		photos: mine.length,
		wins: mine.filter((p) => p.badge === 'day').length,
		average,
		days
	};
}
