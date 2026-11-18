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
}
