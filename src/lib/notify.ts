/** Mitteilungsarten und Einstellungen pro Benutzer – gemeinsam für Server und Browser. */

export const NOTIFY_KINDS = [
	{ key: 'upload', label: 'Hochladen-Erinnerung', hint: 'morgens, wenn noch ein Foto fehlt' },
	{ key: 'voting', label: 'Bewertung offen', hint: 'um 20 Uhr' },
	{ key: 'result', label: 'Resultat & Wochenfoto', hint: 'am Morgen' },
	{ key: 'weekly', label: 'Wochenfoto wählen', hint: 'am Wochenbewertungstag' },
	{ key: 'feedbackRound', label: 'Feedback-Runde', hint: 'beim Start einer Runde' },
	{ key: 'feedbackNew', label: 'Neues Feedback zu deinem Foto', hint: 'mit Namen' }
] as const;

export type NotifyKind = (typeof NOTIFY_KINDS)[number]['key'];
export type Channel = 'push' | 'mail';
export type NotifyPrefs = Record<NotifyKind, Record<Channel, boolean>>;

/**
 * Standard: Push für alles (sobald ein Gerät Push erlaubt hat). Mail wie die
 * frühere Einstellung «Erinnerungen per Mail»; neues Feedback nur per Push.
 */
export function defaultPrefs(emailOn: boolean): NotifyPrefs {
	const prefs = {} as NotifyPrefs;
	for (const { key } of NOTIFY_KINDS) {
		prefs[key] = { push: true, mail: emailOn && key !== 'feedbackNew' };
	}
	return prefs;
}

/** Gespeicherte Einstellungen über die Standardwerte legen (neue Arten bekommen den Standard). */
export function resolvePrefs(stored: Partial<NotifyPrefs> | null, emailOn: boolean): NotifyPrefs {
	const prefs = defaultPrefs(emailOn);
	for (const { key } of NOTIFY_KINDS) {
		const s = stored?.[key];
		if (s) prefs[key] = { push: s.push ?? prefs[key].push, mail: s.mail ?? prefs[key].mail };
	}
	return prefs;
}

/** Push wird nachts zurückgehalten: 22:00–07:00 (Zürcher Zeit). */
export const QUIET_FROM = 22;
export const QUIET_UNTIL = 7;
export const isQuietHour = (hour: number) => hour >= QUIET_FROM || hour < QUIET_UNTIL;
