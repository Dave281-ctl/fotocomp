import { describe, expect, it } from 'vitest';
import { defaultPrefs, isQuietHour, resolvePrefs } from './notify.ts';

describe('Mitteilungs-Einstellungen', () => {
	it('Standard: Push für alles, Mail wie bisher, neues Feedback nur per Push', () => {
		const p = defaultPrefs(true);
		expect(p.voting).toEqual({ push: true, mail: true });
		expect(p.feedbackNew).toEqual({ push: true, mail: false });
		expect(defaultPrefs(false).voting).toEqual({ push: true, mail: false });
	});
	it('gespeicherte Werte gehen vor, fehlende Arten bekommen den Standard', () => {
		const p = resolvePrefs({ voting: { push: false, mail: true } }, true);
		expect(p.voting).toEqual({ push: false, mail: true });
		expect(p.result).toEqual({ push: true, mail: true });
	});
	it('Nachtruhe von 22 bis 7 Uhr', () => {
		expect([21, 22, 3, 6, 7].map(isQuietHour)).toEqual([false, true, true, true, false]);
	});
});
