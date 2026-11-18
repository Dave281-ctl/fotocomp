/**
 * Zeitlogik des Wettbewerbs. Alles wird aus der Uhrzeit berechnet (Europe/Zurich),
 * nichts davon wird in der Datenbank gespeichert.
 *
 * Ein Wettbewerbstag D dauert von 05:00 (D) bis 05:00 (D+1):
 *   05:00–20:00  Upload
 *   20:00–05:00  Bewertung
 *   05:00 (D+1)  Enthüllung, danach beginnt Tag D+1
 * Am Wochenbewertungstag gibt es keinen Upload; der ganze Tag ist Wochenbewertung
 * über die sechs Tage davor.
 */
import { TZDate } from '@date-fns/tz';

export const TIME_ZONE = 'Europe/Zurich';
export const DAY_START_HOUR = 5;
export const VOTING_START_HOUR = 20;

export const WEEKDAYS = [
	'Montag',
	'Dienstag',
	'Mittwoch',
	'Donnerstag',
	'Freitag',
	'Samstag',
	'Sonntag'
];

/** Ein Datum als «YYYY-MM-DD». */
export type Day = string;

export interface ThemeSchedule {
	startDate: Day;
	endDate: Day | null;
	endedAt: Date | null;
	weeklyVoteDay: number | null;
}

export type Phase =
	| { kind: 'upcoming'; startsAt: Date }
	| { kind: 'ended' }
	| { kind: 'upload'; day: Day; endsAt: Date }
	| { kind: 'voting'; day: Day; endsAt: Date }
	| { kind: 'weekly'; day: Day; weekFrom: Day; weekTo: Day; endsAt: Date };

const pad = (n: number) => String(n).padStart(2, '0');

/** Datum und Uhrzeit eines Zeitpunkts in Zürcher Zeit. */
export function zurichParts(now: Date) {
	const z = new TZDate(now.getTime(), TIME_ZONE);
	return {
		date: `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`,
		hour: z.getHours(),
		minute: z.getMinutes()
	};
}

/** Zeitpunkt für ein Datum und eine Uhrzeit in Zürcher Zeit. */
export function at(day: Day, hour: number, minute = 0): Date {
	const [y, m, d] = day.split('-').map(Number);
	return new Date(new TZDate(y, m - 1, d, hour, minute, TIME_ZONE).getTime());
}

export function addDays(day: Day, days: number): Day {
	const [y, m, d] = day.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d + days));
	return date.toISOString().slice(0, 10);
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export function isoWeekday(day: Day): number {
	const [y, m, d] = day.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

/** Der laufende Wettbewerbstag: vor 05:00 zählt noch der Vortag. */
export function gameDay(now: Date): Day {
	const { date, hour } = zurichParts(now);
	return hour < DAY_START_HOUR ? addDays(date, -1) : date;
}

export function isWeeklyVoteDay(theme: ThemeSchedule, day: Day): boolean {
	return theme.weeklyVoteDay != null && isoWeekday(day) === theme.weeklyVoteDay;
}

/** In welcher Phase befindet sich ein Thema zum Zeitpunkt `now`? */
export function themePhase(theme: ThemeSchedule, now: Date): Phase {
	const day = gameDay(now);
	if (theme.endedAt && theme.endedAt <= now) return { kind: 'ended' };
	if (day < theme.startDate)
		return { kind: 'upcoming', startsAt: at(theme.startDate, DAY_START_HOUR) };
	if (theme.endDate && day > theme.endDate) return { kind: 'ended' };

	const nextDayStart = at(addDays(day, 1), DAY_START_HOUR);
	if (isWeeklyVoteDay(theme, day)) {
		return {
			kind: 'weekly',
			day,
			weekFrom: addDays(day, -6),
			weekTo: addDays(day, -1),
			endsAt: nextDayStart
		};
	}
	const { hour } = zurichParts(now);
	if (hour >= DAY_START_HOUR && hour < VOTING_START_HOUR) {
		return { kind: 'upload', day, endsAt: at(day, VOTING_START_HOUR) };
	}
	return { kind: 'voting', day, endsAt: nextDayStart };
}

/** Ist das Thema noch nicht beendet (läuft oder beginnt bald)? */
export function isThemeOpen(theme: ThemeSchedule, now: Date): boolean {
	return themePhase(theme, now).kind !== 'ended';
}

/**
 * Sind die Resultate eines Tages schon enthüllt? Das ist ab 05:00 am Folgetag so.
 * Gilt für Tages- wie Wochenbewertung.
 */
export function isRevealed(day: Day, now: Date): boolean {
	return now >= at(addDays(day, 1), DAY_START_HOUR);
}

/** Der letzte enthüllte Tagesrunde vor dem laufenden Tag (Wochenbewertungstage übersprungen). */
export function lastRevealedDay(theme: ThemeSchedule, now: Date): Day | null {
	let day = addDays(gameDay(now), -1);
	if (theme.endDate && day > theme.endDate) day = theme.endDate;
	for (let i = 0; i < 7 && day >= theme.startDate; i++, day = addDays(day, -1)) {
		if (!isWeeklyVoteDay(theme, day)) return day;
	}
	return null;
}

// ------------------------------------------------------------- Formatierung

const formatter = (options: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('de-CH', { timeZone: TIME_ZONE, ...options });

const dayFormat = formatter({ weekday: 'long', day: 'numeric', month: 'long' });
const shortDayFormat = formatter({ weekday: 'short', day: 'numeric', month: 'short' });
const timeFormat = formatter({ hour: '2-digit', minute: '2-digit' });

/** «Mittwoch, 18. November» */
export function formatDay(day: Day): string {
	return dayFormat.format(at(day, 12));
}

/** «Mi., 18. Nov.» */
export function formatShortDay(day: Day): string {
	return shortDayFormat.format(at(day, 12));
}

export function formatTime(date: Date): string {
	return timeFormat.format(date);
}

interface ThemeSummaryInput {
	startDate: Day;
	endDate: Day | null;
	weeklyVoteDay: number | null;
	feedbackDay: number | null;
	feedbackTime: string | null;
	feedbackHours: number;
}

/** Kurzbeschreibung des Ablaufs, z.B. für die Themenliste. */
export function themeSummary(t: ThemeSummaryInput): string[] {
	const lines = [
		t.endDate
			? `${formatShortDay(t.startDate)} – ${formatShortDay(t.endDate)}`
			: `Ab ${formatShortDay(t.startDate)}, wiederkehrend`
	];
	if (t.weeklyVoteDay) lines.push(`Wochenbewertung am ${WEEKDAYS[t.weeklyVoteDay - 1]}`);
	if (t.feedbackDay && t.feedbackTime) {
		lines.push(
			`Feedback-Runde ${WEEKDAYS[t.feedbackDay - 1]} ${t.feedbackTime} (${t.feedbackHours} h)`
		);
	}
	return lines;
}
