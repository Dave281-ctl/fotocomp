import { describe, expect, it } from 'vitest';
import {
	eventSection,
	excerpt,
	mailSubject,
	motivation,
	notifyKind,
	pickHighlight,
	pushText,
	uploadStreak
} from './mail-texts.ts';

const today = '2026-11-23';

describe('Highlight-Zeile', () => {
	it('Feedback mit Namen hat Vorrang', () => {
		const h = pickHighlight(
			{
				feedback: { author: 'Lea', day: '2026-11-17', excerpt: 'Schönes Licht', photoId: 7 },
				win: { kind: 'day', day: '2026-11-22', theme: 'Holz', average: 4.6 },
				streak: 5
			},
			'morning',
			today
		);
		expect(h.kind).toBe('feedback');
		expect(h.text).toContain('Lea hat dir');
		expect(h.text).toContain('«Schönes Licht»');
		expect(h.link).toEqual({ label: 'Feedback lesen', path: '/foto/7' });
	});

	it('danach der eigene Erfolg, anonym', () => {
		const h = pickHighlight(
			{ win: { kind: 'day', day: '2026-11-22', theme: 'Holz', average: 4.6 }, streak: 5 },
			'morning',
			today
		);
		expect(h).toEqual({
			kind: 'win',
			text: 'Dein Foto gestern hat mit ★ 4.6 den Tagessieg in «Holz» geholt. Weiter so!'
		});
	});

	it('Wochenfoto', () => {
		const h = pickHighlight(
			{ win: { kind: 'week', day: '2026-11-18', theme: 'Holz', average: null } },
			'morning',
			today
		);
		expect(h.text).toContain('Wochenfoto in «Holz»');
	});

	it('Serie ab 3 Tagen', () => {
		expect(pickHighlight({ streak: 3 }, 'evening', today).kind).toBe('streak');
		expect(pickHighlight({ streak: 2 }, 'evening', today).kind).toBe('motivation');
	});

	it('Motivationssatz wechselt täglich', () => {
		expect(motivation('morning', '2026-11-23')).not.toBe(motivation('morning', '2026-11-24'));
		expect(motivation('morning', '2026-11-23')).toBe(motivation('morning', '2026-11-23'));
	});
});

describe('Hilfen', () => {
	it('zählt die Serie bis heute oder gestern', () => {
		expect(uploadStreak(['2026-11-21', '2026-11-22', '2026-11-23'], today)).toBe(3);
		expect(uploadStreak(['2026-11-20', '2026-11-21', '2026-11-22'], today)).toBe(3);
		expect(uploadStreak(['2026-11-20', '2026-11-22'], today)).toBe(1);
		expect(uploadStreak(['2026-11-20'], today)).toBe(0);
	});

	it('ein Upload-Abschnitt für alle Themen', () => {
		const s = eventSection({ kind: 'upload', themes: ['Holz', 'Rot'], until: '20:00' }, 'u');
		expect(s.text).toContain('«Holz» und «Rot»');
	});

	it('kürzt lange Texte auf ganze Wörter', () => {
		const long = 'Das Licht im Hintergrund ist wirklich wunderschön '.repeat(5);
		const short = excerpt(long);
		expect(short.length).toBeLessThanOrEqual(122);
		expect(short.endsWith(' …')).toBe(true);
		expect(excerpt('  kurz  und\nknapp ')).toBe('kurz und knapp');
	});

	it('Betreff: konkret bei einem Ereignis, sonst gesammelt', () => {
		expect(mailSubject([{ kind: 'voting', theme: 'Holz', photos: 3 }])).toBe(
			'Holz: Zeit zum Bewerten'
		);
		expect(
			mailSubject([
				{ kind: 'voting', theme: 'Holz', photos: 3 },
				{ kind: 'voting', theme: 'Rot', photos: 2 }
			])
		).toBe('Zeit zum Bewerten: Holz und Rot');
		expect(
			mailSubject([
				{ kind: 'result', theme: 'Holz', day: '2026-11-22' },
				{ kind: 'weekly', theme: 'Rot' },
				{ kind: 'upload', themes: ['Holz'], until: '20:00' }
			])
		).toBe('Guten Morgen! Neues aus Holz und Rot');
		expect(
			mailSubject([
				{ kind: 'result', theme: 'A', day: '2026-11-22' },
				{ kind: 'result', theme: 'B', day: '2026-11-22' },
				{ kind: 'feedback', theme: 'C' }
			])
		).toBe('Neues aus 3 Themen');
	});
});

describe('Push', () => {
	it('fasst mehrere Ereignisse in einer Mitteilung zusammen', () => {
		const push = pushText([
			{ kind: 'result', theme: 'Holz', day: '2026-11-22' },
			{ kind: 'upload', themes: ['Holz'], until: '20:00' }
		]);
		expect(push.title).toBe('Holz: Das Resultat ist da');
		expect(push.body).toBe(
			'«Holz»: Das Resultat ist da – wer hat gewonnen?\nDein Foto für «Holz» kannst du bis 20:00 Uhr hochladen.'
		);
	});
	it('neues Feedback nennt den Namen', () => {
		const push = pushText([
			{ kind: 'feedbackNew', theme: 'Holz', author: 'Sofia', excerpt: 'Schönes Licht!' }
		]);
		expect(push).toEqual({ title: 'Sofia hat dir Feedback gegeben', body: '«Schönes Licht!»' });
		const mixed = pushText([
			{ kind: 'voting', theme: 'Holz', photos: 2 },
			{ kind: 'feedbackNew', theme: 'Holz', author: 'Sofia', excerpt: 'Schönes Licht!' }
		]);
		expect(mixed.body).toBe('«Holz»: 2 Fotos warten auf deine Sterne.\nSofia: «Schönes Licht!»');
	});
	it('ordnet Ereignisse den Einstellungen zu', () => {
		expect(notifyKind({ kind: 'weeklyResult', theme: 'Holz' })).toBe('result');
		expect(notifyKind({ kind: 'feedback', theme: 'Holz' })).toBe('feedbackRound');
		expect(notifyKind({ kind: 'voting', theme: 'Holz', photos: 3 })).toBe('voting');
	});
});
