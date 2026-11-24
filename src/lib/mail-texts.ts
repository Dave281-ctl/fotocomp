/**
 * Texte der Erinnerungsmails. Hier lassen sich alle Formulierungen anpassen.
 * Reine Funktionen ohne Datenbank, damit sie testbar bleiben.
 */
import type { NotifyKind } from './notify.ts';
import { addDays, formatDay, type Day } from './schedule.ts';

/** Ereignisse, die in einer Sammelmail landen können. */
export type MailEvent =
	| { kind: 'voting'; theme: string; photos: number }
	| { kind: 'result'; theme: string; day: Day }
	| { kind: 'weekly'; theme: string }
	| { kind: 'weeklyResult'; theme: string }
	| { kind: 'feedback'; theme: string }
	/** Jemand hat dem Empfänger Feedback zu einem Foto gegeben (mit Namen). */
	| { kind: 'feedbackNew'; theme: string; author: string; excerpt: string }
	/** Morgens: Themen, in denen heute noch ein Foto fehlt (ein Abschnitt für alle). */
	| { kind: 'upload'; themes: string[]; until: string };

export interface MailSection {
	heading: string;
	text: string;
	link: { label: string; url: string };
}

/** Abschnitt pro Ereignis: Thema als Überschrift, ein Satz, ein Link. */
export function eventSection(event: MailEvent, url: string): MailSection {
	if (event.kind === 'upload') {
		return {
			heading: 'Foto des Tages',
			text: `Neuer Tag, neues Motiv: Dein Foto für ${listThemes(event.themes)} kannst du bis ${event.until} Uhr hochladen.`,
			link: { label: 'Foto hochladen', url }
		};
	}
	const heading = event.theme;
	switch (event.kind) {
		case 'voting':
			return {
				heading,
				text:
					event.photos === 1
						? 'Heute wartet ein Foto auf deine Sterne. Bewerten kannst du bis morgen um 05:00 Uhr.'
						: `${event.photos} Fotos warten auf deine Sterne. Bewerten kannst du bis morgen um 05:00 Uhr.`,
				link: { label: 'Jetzt bewerten', url }
			};
		case 'result':
			return {
				heading,
				text: `Das Resultat von ${formatDay(event.day)} ist enthüllt. Wer hat gewonnen?`,
				link: { label: 'Resultat ansehen', url }
			};
		case 'weekly':
			return {
				heading,
				text: 'Heute wird das Wochenfoto gekürt. Wähle deine drei Favoriten der Woche.',
				link: { label: 'Wochenfoto wählen', url }
			};
		case 'weeklyResult':
			return {
				heading,
				text: 'Das Wochenfoto ist gekürt. Schau dir an, welches Foto die Woche gemacht hat.',
				link: { label: 'Wochenfoto ansehen', url }
			};
		case 'feedback':
			return {
				heading,
				text: 'Die Feedback-Runde hat begonnen. Ein paar ehrliche, freundliche Worte helfen allen, besser zu werden.',
				link: { label: 'Zur Feedback-Runde', url }
			};
		case 'feedbackNew':
			return {
				heading,
				text: `${event.author} hat dir Feedback zu deinem Foto gegeben: «${event.excerpt}»`,
				link: { label: 'Feedback lesen', url }
			};
	}
}

/** Zu welcher Einstellung (Profil → Mitteilungen) gehört ein Ereignis? */
export function notifyKind(event: MailEvent): NotifyKind {
	switch (event.kind) {
		case 'weeklyResult':
			return 'result';
		case 'feedback':
			return 'feedbackRound';
		default:
			return event.kind;
	}
}

/** «Holz», «Holz» und «Rot», «Holz», «Rot» und «Wald» */
function listThemes(themes: string[]): string {
	const quoted = themes.map((t) => `«${t}»`);
	return quoted.length > 1 ? `${quoted.slice(0, -1).join(', ')} und ${quoted.at(-1)}` : quoted[0];
}

/** Betreff: konkret bei einem Ereignis, sonst eine Sammelzeile. */
export function mailSubject(events: MailEvent[]): string {
	const main = events.filter((e) => e.kind !== 'upload');
	if (main.length === 0) return 'Zeit für ein neues Foto';
	if (main.length === 1) {
		const e = main[0];
		if (e.kind === 'feedbackNew') return `${e.author} hat dir Feedback gegeben`;
		const what = {
			voting: 'Zeit zum Bewerten',
			result: 'Das Resultat ist da',
			weekly: 'Wähle das Wochenfoto',
			weeklyResult: 'Das Wochenfoto ist gekürt',
			feedback: 'Die Feedback-Runde beginnt'
		}[e.kind as Exclude<MailEvent['kind'], 'upload' | 'feedbackNew'>];
		return `${e.theme}: ${what}`;
	}
	const themes = [...new Set(main.map((e) => e.theme))];
	const list = themes.length > 2 ? `${themes.length} Themen` : themes.join(' und ');
	if (main.every((e) => e.kind === 'voting')) return `Zeit zum Bewerten: ${list}`;
	if (main.every((e) => e.kind === 'result' || e.kind === 'weekly' || e.kind === 'weeklyResult'))
		return `Guten Morgen! Neues aus ${list}`;
	return `Neues aus ${list}`;
}

// --------------------------------------------------------------- Push

/** Eine kurze Zeile pro Ereignis für die Push-Mitteilung. */
export function pushLine(event: MailEvent): string {
	if (event.kind === 'upload') {
		return `Dein Foto für ${listThemes(event.themes)} kannst du bis ${event.until} Uhr hochladen.`;
	}
	const t = `«${event.theme}»`;
	switch (event.kind) {
		case 'voting':
			return event.photos === 1
				? `${t}: Ein Foto wartet auf deine Sterne.`
				: `${t}: ${event.photos} Fotos warten auf deine Sterne.`;
		case 'result':
			return `${t}: Das Resultat ist da – wer hat gewonnen?`;
		case 'weekly':
			return `${t}: Wähle deine drei Favoriten der Woche.`;
		case 'weeklyResult':
			return `${t}: Das Wochenfoto ist gekürt.`;
		case 'feedback':
			return `${t}: Die Feedback-Runde hat begonnen.`;
		case 'feedbackNew':
			return `${event.author}: «${event.excerpt}»`;
	}
}

/** Titel und Text der Push-Mitteilung: wie der Mail-Betreff, darunter eine Zeile pro Ereignis. */
export function pushText(events: MailEvent[]) {
	const [only] = events;
	// Einzelnes Feedback: Der Name steht schon im Titel
	if (events.length === 1 && only.kind === 'feedbackNew') {
		return { title: mailSubject(events), body: `«${only.excerpt}»` };
	}
	return { title: mailSubject(events), body: events.map(pushLine).join('\n') };
}

// --------------------------------------------------------------- Highlight

export interface HighlightData {
	/** Neuestes, noch nicht erwähntes Feedback an den Empfänger. */
	feedback?: { author: string; day: Day; excerpt: string; photoId: number } | null;
	/** Neuester, noch nicht erwähnter Erfolg. */
	win?: { kind: 'day' | 'week'; day: Day; theme: string; average: number | null } | null;
	/** An wie vielen Tagen in Folge der Empfänger zuletzt ein Foto hochgeladen hat. */
	streak?: number;
}

export interface Highlight {
	kind: 'feedback' | 'win' | 'streak' | 'motivation';
	text: string;
	/** Pfad zum Foto, z.B. um das Feedback zu lesen. */
	link?: { label: string; path: string };
}

/** Kürzt einen Text auf ganze Wörter. */
export function excerpt(text: string, max = 120): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= max) return clean;
	const cut = clean.slice(0, max);
	return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : max)} …`;
}

const MOTIVATION: Record<'morning' | 'evening' | 'other', string[]> = {
	morning: [
		'Neuer Tag, neues Motiv. Was entdeckst du heute?',
		'Das beste Licht gibt es oft am frühen Morgen. Kamera einpacken!',
		'Manchmal liegt das beste Foto direkt vor der Haustür.',
		'Ein ungewohnter Blickwinkel macht aus Alltäglichem ein Bild.',
		'Heute zählt nicht das perfekte Foto, sondern dass du dabei bist.'
	],
	evening: [
		'Deine Freunde warten auf deine Sterne.',
		'Ein paar Minuten Bewerten, und alle wissen morgen, was gut ankam.',
		'Schau genau hin: Hinter jedem Foto steckt eine Idee.',
		'Jede Bewertung zählt, auch die eine Stimme, die den Ausschlag gibt.',
		'Gute Fotos verdienen Aufmerksamkeit. Deine Sterne geben sie ihnen.'
	],
	other: [
		'Schön, dass du dabei bist.',
		'Gemeinsam fotografieren macht einfach mehr Spass.',
		'Jedes Foto bringt dich ein Stück weiter.'
	]
};

/** Wechselt täglich durch die Motivationssätze. */
export function motivation(slot: keyof typeof MOTIVATION, day: Day): string {
	const list = MOTIVATION[slot];
	const n = Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
	return list[((n % list.length) + list.length) % list.length];
}

/**
 * Die persönliche Zeile oben in der Mail. Reihenfolge: Feedback mit Namen,
 * eigener Erfolg (anonym), Serie, sonst ein wechselnder Motivationssatz.
 */
export function pickHighlight(
	data: HighlightData,
	slot: keyof typeof MOTIVATION,
	today: Day
): Highlight {
	if (data.feedback) {
		const f = data.feedback;
		return {
			kind: 'feedback',
			text: `${f.author} hat dir zu deinem Foto von ${formatDay(f.day)} geschrieben: «${f.excerpt}»`,
			link: { label: 'Feedback lesen', path: `/foto/${f.photoId}` }
		};
	}
	if (data.win) {
		const w = data.win;
		const when = w.day === addDays(today, -1) ? 'gestern' : `von ${formatDay(w.day)}`;
		const stars = w.average ? ` mit ★ ${w.average.toFixed(1)}` : '';
		return {
			kind: 'win',
			text:
				w.kind === 'week'
					? `Dein Foto ${when} ist das Wochenfoto in «${w.theme}». Gratuliere!`
					: `Dein Foto ${when} hat${stars} den Tagessieg in «${w.theme}» geholt. Weiter so!`
		};
	}
	if (data.streak && data.streak >= 3) {
		return {
			kind: 'streak',
			text: `Du bist seit ${data.streak} Tagen jeden Tag dabei. Bleib dran!`
		};
	}
	return { kind: 'motivation', text: motivation(slot, today) };
}

/** Anzahl Tage in Folge mit eigenem Foto, endend heute oder gestern. */
export function uploadStreak(days: Day[], today: Day): number {
	const set = new Set(days);
	let day = set.has(today) ? today : addDays(today, -1);
	let n = 0;
	while (set.has(day)) {
		n++;
		day = addDays(day, -1);
	}
	return n;
}
