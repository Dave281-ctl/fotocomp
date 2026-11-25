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
	kind: 'result' | 'weekly' | 'feedback';
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
