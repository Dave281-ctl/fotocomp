/** Gemeinsame Typen für Server und Browser. */

/** Für Fotografen interessante Metadaten aus dem EXIF. */
export interface PhotoExif {
	make?: string;
	model?: string;
	lens?: string;
	focalLength?: number;
	focalLength35?: number;
	aperture?: number;
	exposureTime?: number;
	iso?: number;
	takenAt?: string;
	latitude?: number;
	longitude?: number;
	altitude?: number;
}

/** Ein Foto, wie es in Feed, Bewertung und Vollbild angezeigt wird. */
export interface FeedPhoto {
	id: number;
	day: string;
	width: number;
	height: number;
	isOwn: boolean;
	/** Name des Fotografen; während der Bewertung verborgen (ausser beim eigenen Foto). */
	userName: string | null;
	userId: number | null;
	feedbackWanted: boolean;
	myStars: number | null;
	average: number | null;
	votes: number | null;
	rank: number | null;
	themeId: number;
	/** Auszeichnung: Tagessieg oder Wochenfoto (nur nach der Enthüllung). */
	badge: 'day' | 'week' | null;
	/** Nur in der Galerie gesetzt, um das Thema neben dem Namen zu zeigen. */
	theme?: { id: number; title: string };
}

/** Eine Aufgabe in einem Thema (Heute, Themenansicht). */
export interface Task {
	kind: 'upload' | 'vote' | 'weekly' | 'feedback';
	title: string;
	/** z.B. «bis 20:00 Uhr» oder «2 von 4 · bis morgen 05:00 Uhr» */
	detail: string;
	done: boolean;
	href: string;
	/** Frist, nach der sich die Dringlichkeit richtet */
	due: Date | null;
}

/** Eine Neuigkeit in einem Thema (Heute). */
export interface NewsItem {
	kind: 'result' | 'weekly' | 'feedback' | 'mention';
	at: Date;
	/** «heute 05:00» */
	when: string;
	title: string;
	text: string;
	photoId: number | null;
	href: string;
	/** Seit dem letzten Besuch von «Heute» dazugekommen */
	isNew: boolean;
}

/** Eine Chatnachricht, wie sie im Browser angezeigt wird. */
export interface ChatMessage {
	id: number;
	chatId: number;
	author: { id: number; name: string; isAdmin: boolean };
	/** Leer, wenn gelöscht */
	body: string;
	deleted: boolean;
	createdAt: Date;
	replyTo:
		{ id: number; authorName: string; excerpt: string } | { id: number; missing: true } | null;
	reactions: { emoji: string; users: { id: number; name: string }[] }[];
	mentions: { id: number; name: string }[];
}

/** Ein Eintrag der Chatliste. */
export interface ChatSummary {
	id: number;
	kind: 'direct' | 'theme' | 'help';
	title: string;
	/** Einzelchat: die andere Person (für Avatar und Link) */
	person: { id: number; name: string } | null;
	themeId: number | null;
	last: { author: string; excerpt: string; at: Date; own: boolean } | null;
	unread: number;
	mentioned: boolean;
	muted: boolean;
	readOnly: boolean;
}
