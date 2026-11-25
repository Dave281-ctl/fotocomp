import { describe, expect, it } from 'vitest';
import {
	DEFAULT_CHAT_NOTIFY,
	adminRetention,
	chatExcerpt,
	effectiveRetention,
	mentionedIn,
	pushReason,
	retentionLabel,
	segments,
	userRetentionOptions
} from './chat-rules.ts';

describe('Aufbewahrung', () => {
	it('beschriftet die Zeiten', () => {
		expect([1, 3, 7, 14, 30, 90, 180].map(retentionLabel)).toEqual([
			'1 Tag',
			'3 Tage',
			'1 Woche',
			'2 Wochen',
			'1 Monat',
			'3 Monate',
			'6 Monate'
		]);
	});
	it('Admin-Vorgabe: Standard 2 Wochen, höchstens 6 Monate', () => {
		expect(adminRetention(undefined)).toBe(14);
		expect(adminRetention('30')).toBe(30);
		expect(adminRetention('999')).toBe(180);
	});
	it('die kürzere Zeit gilt; wählen nur bis zur Vorgabe', () => {
		expect(effectiveRetention(14, 3)).toBe(3);
		expect(effectiveRetention(7, 30)).toBe(7);
		expect(effectiveRetention(14, null)).toBe(14);
		expect(userRetentionOptions(14)).toEqual([1, 3, 7, 14]);
	});
});

describe('Push bei Chatnachrichten', () => {
	const base = {
		prefs: DEFAULT_CHAT_NOTIFY,
		mentioned: false,
		repliedTo: false,
		isAdmin: false,
		muted: false
	};
	it('Einzelchat ja, Themen-Chat standardmässig nur bei Erwähnung', () => {
		expect(pushReason({ ...base, kind: 'direct' })).toBe('direct');
		expect(pushReason({ ...base, kind: 'theme' })).toBeNull();
		expect(pushReason({ ...base, kind: 'theme', mentioned: true })).toBe('mention');
		expect(pushReason({ ...base, kind: 'theme', repliedTo: true })).toBe('reply');
	});
	it('Hilfe-Chat: Admins bei jeder Nachricht', () => {
		expect(pushReason({ ...base, kind: 'help', isAdmin: true })).toBe('help');
		expect(pushReason({ ...base, kind: 'help' })).toBeNull();
	});
	it('stumm: nur noch Erwähnungen und Antworten', () => {
		expect(pushReason({ ...base, kind: 'direct', muted: true })).toBeNull();
		expect(pushReason({ ...base, kind: 'direct', muted: true, mentioned: true })).toBe('mention');
	});
});

describe('Nachrichten zerlegen', () => {
	const origin = 'https://fotos.example.com';
	const people = [
		{ id: 1, name: 'Lea' },
		{ id: 2, name: 'Lea Brunner' }
	];
	it('erkennt Erwähnungen, längster Name zuerst', () => {
		expect(segments('Hallo @Lea Brunner!', people, origin)).toEqual([
			{ type: 'text', text: 'Hallo ' },
			{ type: 'mention', text: '@Lea Brunner', userId: 2 },
			{ type: 'text', text: '!' }
		]);
	});
	it('erkennt Links und Fotos der Plattform', () => {
		const s = segments(`Schau ${origin}/foto/12 und https://example.org/x.`, [], origin);
		expect(s).toEqual([
			{ type: 'text', text: 'Schau ' },
			{ type: 'photo', text: `${origin}/foto/12`, photoId: 12 },
			{ type: 'text', text: ' und ' },
			{ type: 'link', text: 'https://example.org/x', href: 'https://example.org/x' },
			{ type: 'text', text: '.' }
		]);
	});
	it('findet Erwähnte und kürzt Auszüge', () => {
		expect(mentionedIn('@Lea kommst du?', people).map((p) => p.id)).toEqual([1]);
		expect(chatExcerpt('a'.repeat(100), 10)).toBe('aaaaaaaaa…');
	});
});
