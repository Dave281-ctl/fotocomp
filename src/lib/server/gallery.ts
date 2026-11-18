import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { addDays, gameDay, isPhotoPublic, isRevealed, themePhase } from '../schedule.ts';
import { rankDaily } from '../scoring.ts';
import { db } from './db.ts';
import { photos, users, votes, type Photo, type User } from './schema.ts';
import { isMember } from './themes.ts';
import type { FeedPhoto } from '../types.ts';

export type { FeedPhoto };

type PhotoRow = Pick<Photo, 'id' | 'day' | 'width' | 'height' | 'userId' | 'feedbackWanted'> & {
	userName: string;
};

const photoColumns = {
	id: photos.id,
	day: photos.day,
	width: photos.width,
	height: photos.height,
	userId: photos.userId,
	feedbackWanted: photos.feedbackWanted,
	userName: users.name
};

/** Stabile, pro Betrachter unterschiedliche Reihenfolge, damit die Position nicht beeinflusst. */
const shuffleKey = (photoId: number, viewerId: number) =>
	(photoId * 7919 + viewerId * 104729) % 9973;

/** Ergänzt Fotos um Bewertungen, Ränge und blendet Namen bis zur Enthüllung aus. */
export async function decorate(
	rows: PhotoRow[],
	viewerId: number,
	now: Date
): Promise<FeedPhoto[]> {
	if (rows.length === 0) return [];
	const voteRows = await db
		.select({ photoId: votes.photoId, voterId: votes.voterId, stars: votes.stars })
		.from(votes)
		.where(
			inArray(
				votes.photoId,
				rows.map((r) => r.id)
			)
		);

	const byDay = Map.groupBy(rows, (r) => r.day);
	const result: FeedPhoto[] = [];
	for (const [day, dayRows] of byDay) {
		const revealed = isRevealed(day, now);
		const ranking = revealed
			? new Map(
					rankDaily(
						dayRows.map((r) => ({
							photoId: r.id,
							stars: voteRows.filter((v) => v.photoId === r.id).map((v) => v.stars)
						}))
					).map((x) => [x.photoId, x])
				)
			: null;

		const decorated = dayRows.map((r): FeedPhoto => {
			const isOwn = r.userId === viewerId;
			const ranked = ranking?.get(r.id);
			return {
				id: r.id,
				day: r.day,
				width: r.width,
				height: r.height,
				isOwn,
				userName: revealed || isOwn ? r.userName : null,
				userId: revealed || isOwn ? r.userId : null,
				feedbackWanted: r.feedbackWanted,
				myStars: voteRows.find((v) => v.photoId === r.id && v.voterId === viewerId)?.stars ?? null,
				average: ranked?.average ?? null,
				votes: ranked?.votes ?? null,
				rank: ranked?.rank ?? null
			};
		});
		decorated.sort((a, b) =>
			revealed
				? a.rank! - b.rank! || a.id - b.id
				: shuffleKey(a.id, viewerId) - shuffleKey(b.id, viewerId)
		);
		result.push(...decorated);
	}
	return result;
}

/** Alle Fotos eines Tages in einem Thema. Fremde Fotos erst ab 20:00. */
export async function getDayPhotos(themeId: number, day: string, viewerId: number, now: Date) {
	const rows = await db
		.select(photoColumns)
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.where(and(eq(photos.themeId, themeId), eq(photos.day, day)));
	const visible = isPhotoPublic(day, now) ? rows : rows.filter((r) => r.userId === viewerId);
	return decorate(visible, viewerId, now);
}

/** Galerie: enthüllte Tage eines Themas, neueste zuerst, seitenweise. */
export async function getGallery(
	themeId: number,
	viewerId: number,
	now: Date,
	opts: { before?: string; days?: number } = {}
) {
	const limitDays = opts.days ?? 7;
	// Enthüllt sind alle Tage vor dem laufenden Wettbewerbstag.
	let lastRevealed = addDays(gameDay(now), -1);
	if (opts.before && opts.before <= lastRevealed) lastRevealed = addDays(opts.before, -1);

	const dayRows = await db
		.selectDistinct({ day: photos.day })
		.from(photos)
		.where(and(eq(photos.themeId, themeId), lt(photos.day, addDays(lastRevealed, 1))))
		.orderBy(desc(photos.day))
		.limit(limitDays + 1);
	const days = dayRows.slice(0, limitDays).map((d) => d.day);
	if (days.length === 0) return { days: [], more: null };

	const rows = await db
		.select(photoColumns)
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.where(and(eq(photos.themeId, themeId), inArray(photos.day, days)));
	const all = await decorate(rows, viewerId, now);
	return {
		days: days.map((day) => ({ day, photos: all.filter((p) => p.day === day) })),
		more: dayRows.length > limitDays ? days[days.length - 1] : null
	};
}

/** Darf der User dieses Foto sehen? */
export function canSeePhoto(photo: Photo, user: User, now: Date) {
	return photo.userId === user.id || user.role === 'admin' || isPhotoPublic(photo.day, now);
}

/** Darf der User dieses Foto jetzt mit Sternen bewerten? */
export async function canVote(
	photo: Photo,
	user: User,
	themeSchedule: Parameters<typeof themePhase>[0],
	now: Date
) {
	if (photo.userId === user.id) return false;
	const phase = themePhase(themeSchedule, now);
	if (phase.kind !== 'voting' || phase.day !== photo.day) return false;
	return isMember(photo.themeId, user.id);
}

export async function castVote(photoId: number, voterId: number, stars: number) {
	await db
		.insert(votes)
		.values({ photoId, voterId, stars })
		.onConflictDoUpdate({
			target: [votes.photoId, votes.voterId],
			set: { stars, createdAt: sql`now()` }
		});
}
