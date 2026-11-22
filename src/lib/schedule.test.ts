import { describe, expect, it } from 'vitest';
import {
	addDays,
	autoFeedbackRound,
	at,
	gameDay,
	isRevealed,
	isoWeekday,
	lastRevealedDay,
	lastWeeklyVoteDay,
	themePhase,
	type ThemeSchedule
} from './schedule.ts';

/** Zürcher Ortszeit als Zeitpunkt, z.B. z('2026-11-18', 19, 59). */
const z = (day: string, h: number, m = 0) => at(day, h, m);

const theme: ThemeSchedule = {
	startDate: '2026-11-16', // Montag
	endDate: null,
	endedAt: null,
	weeklyVoteDay: 7 // Sonntag
};

describe('Hilfsfunktionen', () => {
	it('rechnet Zürcher Zeit korrekt um (Winter- und Sommerzeit)', () => {
		expect(at('2026-01-15', 12).toISOString()).toBe('2026-01-15T11:00:00.000Z');
		expect(at('2026-07-15', 12).toISOString()).toBe('2026-07-15T10:00:00.000Z');
	});

	it('addiert Tage über Monats- und Jahresgrenzen', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
	});

	it('kennt die ISO-Wochentage', () => {
		expect(isoWeekday('2026-11-16')).toBe(1);
		expect(isoWeekday('2026-11-22')).toBe(7);
	});

	it('zählt vor 05:00 noch zum Vortag', () => {
		expect(gameDay(z('2026-11-18', 4, 59))).toBe('2026-11-17');
		expect(gameDay(z('2026-11-18', 5, 0))).toBe('2026-11-18');
	});
});

describe('themePhase', () => {
	it('Upload von 05:00 bis 19:59', () => {
		expect(themePhase(theme, z('2026-11-18', 5)).kind).toBe('upload');
		expect(themePhase(theme, z('2026-11-18', 19, 59))).toMatchObject({
			kind: 'upload',
			day: '2026-11-18'
		});
	});

	it('Bewertung von 20:00 bis 04:59 am Folgetag', () => {
		expect(themePhase(theme, z('2026-11-18', 20))).toMatchObject({
			kind: 'voting',
			day: '2026-11-18'
		});
		expect(themePhase(theme, z('2026-11-19', 4, 59))).toMatchObject({
			kind: 'voting',
			day: '2026-11-18'
		});
		expect(themePhase(theme, z('2026-11-19', 5))).toMatchObject({
			kind: 'upload',
			day: '2026-11-19'
		});
	});

	it('Wochenbewertung am ganzen Wochentag über die sechs Tage davor', () => {
		const phase = themePhase(theme, z('2026-11-22', 21));
		expect(phase).toMatchObject({
			kind: 'weekly',
			day: '2026-11-22',
			weekFrom: '2026-11-16',
			weekTo: '2026-11-21'
		});
		expect(themePhase(theme, z('2026-11-23', 4)).kind).toBe('weekly');
		expect(themePhase(theme, z('2026-11-23', 5)).kind).toBe('upload');
	});

	it('vor dem Start und nach dem Ende', () => {
		expect(themePhase(theme, z('2026-11-16', 4)).kind).toBe('upcoming');
		const fixed = { ...theme, endDate: '2026-11-20' };
		expect(themePhase(fixed, z('2026-11-21', 3)).kind).toBe('voting');
		expect(themePhase(fixed, z('2026-11-21', 5)).kind).toBe('ended');
	});

	it('von Hand beendete Themen', () => {
		const ended = { ...theme, endedAt: z('2026-11-18', 10) };
		expect(themePhase(ended, z('2026-11-18', 9)).kind).toBe('upload');
		expect(themePhase(ended, z('2026-11-18', 10)).kind).toBe('ended');
	});

	it('Zeitumstellung: Phasen bleiben an der Ortszeit', () => {
		// Umstellung auf Sommerzeit am 29.3.2026, auf Winterzeit am 25.10.2026
		const t = { ...theme, startDate: '2026-01-01', weeklyVoteDay: null };
		expect(themePhase(t, z('2026-03-29', 5)).kind).toBe('upload');
		expect(themePhase(t, z('2026-03-29', 20))).toMatchObject({ kind: 'voting' });
		expect(themePhase(t, z('2026-10-25', 4, 59)).kind).toBe('voting');
		expect(themePhase(t, z('2026-10-25', 5)).kind).toBe('upload');
	});
});

describe('Früher Upload, wenn heute niemand hochgeladen hat', () => {
	it('öffnet um 20:00 den Upload für morgen bis morgen 20:00', () => {
		expect(themePhase(theme, z('2026-11-18', 20), true)).toMatchObject({
			kind: 'upload',
			day: '2026-11-19',
			endsAt: z('2026-11-19', 20),
			early: true
		});
		expect(themePhase(theme, z('2026-11-19', 4, 59), true)).toMatchObject({
			kind: 'upload',
			day: '2026-11-19'
		});
	});

	it('gilt nur für leere Tage', () => {
		expect(themePhase(theme, z('2026-11-18', 20), false).kind).toBe('voting');
	});

	it('nicht vor dem Wochenbewertungstag', () => {
		// Sa 21.11.: morgen (So) ist Wochenbewertung, dort gibt es keinen Upload
		expect(themePhase(theme, z('2026-11-21', 21), true).kind).toBe('voting');
	});

	it('nicht am letzten Tag eines Themas mit Enddatum', () => {
		const fixed = { ...theme, endDate: '2026-11-20' };
		expect(themePhase(fixed, z('2026-11-20', 21), true).kind).toBe('voting');
		expect(themePhase(fixed, z('2026-11-19', 21), true).kind).toBe('upload');
	});
});

describe('Enthüllung', () => {
	it('Resultat eines Tages ab 05:00 am Folgetag', () => {
		expect(isRevealed('2026-11-18', z('2026-11-19', 4, 59))).toBe(false);
		expect(isRevealed('2026-11-18', z('2026-11-19', 5))).toBe(true);
	});

	it('letzte enthüllte Tagesrunde überspringt den Wochentag', () => {
		expect(lastRevealedDay(theme, z('2026-11-18', 12))).toBe('2026-11-17');
		expect(lastRevealedDay(theme, z('2026-11-23', 12))).toBe('2026-11-21');
		expect(lastRevealedDay(theme, z('2026-11-16', 12))).toBeNull();
	});
});

describe('lastWeeklyVoteDay', () => {
	it('findet den letzten enthüllten Wochentag', () => {
		expect(lastWeeklyVoteDay(theme, z('2026-11-22', 21))).toBeNull();
		expect(lastWeeklyVoteDay(theme, z('2026-11-23', 5))).toBe('2026-11-22');
		expect(lastWeeklyVoteDay(theme, z('2026-11-29', 4))).toBe('2026-11-22');
		expect(lastWeeklyVoteDay(theme, z('2026-11-30', 5))).toBe('2026-11-29');
	});
});

describe('autoFeedbackRound', () => {
	const fb = { feedbackDay: 1, feedbackTime: '19:00', feedbackHours: 24 };
	it('liefert die laufende Runde', () => {
		const r = autoFeedbackRound(fb, z('2026-11-24', 10))!; // Dienstag
		expect(r.startsAt).toEqual(z('2026-11-23', 19));
		expect(r.endsAt).toEqual(z('2026-11-24', 19));
	});
	it('liefert sonst die nächste Runde', () => {
		const r = autoFeedbackRound(fb, z('2026-11-24', 19))!;
		expect(r.startsAt).toEqual(z('2026-11-30', 19));
	});
	it('ohne Rhythmus keine Runde', () => {
		expect(autoFeedbackRound({ ...fb, feedbackDay: null }, z('2026-11-24', 10))).toBeNull();
	});
});
