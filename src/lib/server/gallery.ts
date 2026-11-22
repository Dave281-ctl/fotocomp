import { and, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { addDays, gameDay, isPhotoPublic, isRevealed, themePhase } from '../schedule.ts';
import { dailyWinners, rankDaily, weeklyWinners } from '../scoring.ts';
import { db } from './db.ts';
import { photos, themes, users, votes, weeklyVotes, type Photo, type User } from './schema.ts';
import { isMember } from './themes.ts';
import type { FeedPhoto } from '../types.ts';

export type { FeedPhoto };

type PhotoRow = Pick<
	Photo,
	'id' | 'day' | 'width' | 'height' | 'userId' | 'themeId' | 'feedbackWanted'
> & {
	userName: string;
};

/** Spalten, die `decorate()` braucht. */
export const photoColumns = {
	id: photos.id,
	day: photos.day,
	width: photos.width,
	height: photos.height,
	userId: photos.userId,
	themeId: photos.themeId,
	feedbackWanted: photos.feedbackWanted,
	userName: users.name
};

/** Stabile, pro Betrachter unterschiedliche Reihenfolge, damit die Position nicht beeinflusst. */
const shuffleKey = (photoId: number, viewerId: number) =>
	(photoId * 7919 + viewerId * 104729) % 9973;

const groupKey = (r: { themeId: number; day: string }) => `${r.themeId}:${r.day}`;

/**
 * Ergänzt Fotos um Bewertungen, Ränge und blendet Namen bis zur Enthüllung aus.
 * Die Ränge gelten immer für alle Fotos eines Thementags, auch wenn nur ein Teil
 * davon angezeigt wird (z.B. gefiltert nach Person).
 */
export async function decorate(
	rows: PhotoRow[],
	viewerId: number,
	now: Date
): Promise<FeedPhoto[]> {
	if (rows.length === 0) return [];
	const groups = new Set(rows.map(groupKey));
	const groupPhotos = (
		await db
			.select({ id: photos.id, themeId: photos.themeId, day: photos.day })
			.from(photos)
			.where(
				and(
					inArray(photos.themeId, [...new Set(rows.map((r) => r.themeId))]),
					inArray(photos.day, [...new Set(rows.map((r) => r.day))])
				)
			)
	).filter((p) => groups.has(groupKey(p)));
	const voteRows = await db
		.select({ photoId: votes.photoId, voterId: votes.voterId, stars: votes.stars })
		.from(votes)
		.where(
			inArray(
				votes.photoId,
				groupPhotos.map((p) => p.id)
			)
		);
	const starsOf = Map.groupBy(voteRows, (v) => v.photoId);

	const result: FeedPhoto[] = [];
	for (const [key, groupRows] of Map.groupBy(rows, groupKey)) {
		const day = groupRows[0].day;
		const revealed = isRevealed(day, now);
		const ranking = revealed
			? new Map(
					rankDaily(
						groupPhotos
							.filter((p) => groupKey(p) === key)
							.map((p) => ({
								photoId: p.id,
								stars: (starsOf.get(p.id) ?? []).map((v) => v.stars)
							}))
					).map((x) => [x.photoId, x])
				)
			: null;

		const decorated = groupRows.map((r): FeedPhoto => {
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
				myStars: starsOf.get(r.id)?.find((v) => v.voterId === viewerId)?.stars ?? null,
				average: ranked?.average ?? null,
				votes: ranked?.votes ?? null,
				rank: ranked?.rank ?? null,
				themeId: r.themeId,
				badge: ranked?.rank === 1 && ranked.votes ? 'day' : null
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

// --------------------------------------------------------------- Galerie

/** Tagessieger und Wochenfotos aller enthüllten Tage bis `lastDay`. */
export async function getWinners(lastDay: string, now: Date) {
	const daily = await db
		.select({
			photoId: photos.id,
			themeId: photos.themeId,
			day: photos.day,
			votes: sql<number>`count(${votes.stars})::int`,
			sum: sql<number>`coalesce(sum(${votes.stars}), 0)::int`
		})
		.from(photos)
		.innerJoin(votes, eq(votes.photoId, photos.id))
		.where(lte(photos.day, lastDay))
		.groupBy(photos.id);

	const weekly = await db
		.select({
			photoId: weeklyVotes.photoId,
			themeId: weeklyVotes.themeId,
			voteDay: weeklyVotes.voteDay,
			points: sql<number>`sum(${weeklyVotes.points})::int`,
			firsts: sql<number>`count(*) filter (where ${weeklyVotes.points} = 3)::int`
		})
		.from(weeklyVotes)
		.groupBy(weeklyVotes.photoId, weeklyVotes.themeId, weeklyVotes.voteDay);

	const badges = new Map<number, 'day' | 'week'>();
	for (const id of dailyWinners(daily.map((r) => ({ ...r, group: groupKey(r) })))) {
		badges.set(id, 'day');
	}
	const revealedWeeks = weekly.filter((r) => isRevealed(r.voteDay, now));
	for (const id of weeklyWinners(
		revealedWeeks.map((r) => ({ ...r, group: `${r.themeId}:${r.voteDay}` }))
	)) {
		badges.set(id, 'week');
	}
	return badges;
}

export type GalleryView = 'sieger' | 'alle';

export interface GalleryFilter {
	view: GalleryView;
	themeId: number | null;
	userId: number | null;
	/** Nur Tage vor diesem Datum (zum Nachladen). */
	before?: string;
}

/** Galerie: enthüllte Fotos, neueste Tage zuerst, seitenweise und gefiltert. */
export async function getGallery(viewerId: number, now: Date, filter: GalleryFilter) {
	const pageDays = filter.view === 'sieger' ? 14 : 7;
	// Enthüllt sind alle Tage vor dem laufenden Wettbewerbstag.
	let lastDay = addDays(gameDay(now), -1);
	if (filter.before && filter.before <= lastDay) lastDay = addDays(filter.before, -1);

	const badges = await getWinners(addDays(gameDay(now), -1), now);
	const where: SQL[] = [lte(photos.day, lastDay)];
	if (filter.themeId) where.push(eq(photos.themeId, filter.themeId));
	if (filter.userId) where.push(eq(photos.userId, filter.userId));
	if (filter.view === 'sieger') {
		if (badges.size === 0) return { days: [], more: null };
		where.push(inArray(photos.id, [...badges.keys()]));
	}

	const dayRows = await db
		.selectDistinct({ day: photos.day })
		.from(photos)
		.where(and(...where))
		.orderBy(desc(photos.day))
		.limit(pageDays + 1);
	const days = dayRows.slice(0, pageDays).map((d) => d.day);
	if (days.length === 0) return { days: [], more: null };

	const rows = await db
		.select({ ...photoColumns, themeTitle: themes.title })
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.innerJoin(themes, eq(photos.themeId, themes.id))
		.where(and(...where, gte(photos.day, days[days.length - 1])));
	const titles = new Map(rows.map((r) => [r.themeId, r.themeTitle]));
	const decorated = (await decorate(rows, viewerId, now)).map((p) => ({
		...p,
		badge: badges.get(p.id) ?? null,
		theme: { id: p.themeId, title: titles.get(p.themeId) ?? '' }
	}));
	// Innerhalb eines Tages: Wochenfotos und Tagessieger zuerst, dann nach Thema und Rang.
	const order = (p: FeedPhoto) => (p.badge === 'week' ? 0 : p.badge === 'day' ? 1 : 2);
	return {
		days: days.map((day) => ({
			day,
			photos: decorated
				.filter((p) => p.day === day)
				.sort(
					(a, b) =>
						order(a) - order(b) ||
						a.themeId - b.themeId ||
						(a.rank ?? 99) - (b.rank ?? 99) ||
						a.id - b.id
				)
		})),
		more: dayRows.length > pageDays ? days[days.length - 1] : null
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
