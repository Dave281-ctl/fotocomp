import { and, asc, between, eq, gt, inArray, isNull } from 'drizzle-orm';
import { autoFeedbackRound, feedbackRoundDays, isPhotoPublic } from '../schedule.ts';
import { db } from './db.ts';
import { decorate, photoColumns } from './gallery.ts';
import {
	feedback,
	feedbackRoundMembers,
	feedbackRounds,
	photos,
	themeMembers,
	users,
	type Photo,
	type Theme,
	type User
} from './schema.ts';
import { isMember } from './themes.ts';

export type FeedbackRound = typeof feedbackRounds.$inferSelect;

// ----------------------------------------------------------- Feedback pro Foto

/** Feedback ist nur für den Fotografen und den jeweiligen Verfasser sichtbar. */
export async function getFeedback(photo: Photo, viewer: User) {
	const isOwner = photo.userId === viewer.id;
	return db
		.select({
			id: feedback.id,
			body: feedback.body,
			createdAt: feedback.createdAt,
			authorId: feedback.authorId,
			authorName: users.name
		})
		.from(feedback)
		.innerJoin(users, eq(feedback.authorId, users.id))
		.where(
			isOwner
				? eq(feedback.photoId, photo.id)
				: and(eq(feedback.photoId, photo.id), eq(feedback.authorId, viewer.id))
		)
		.orderBy(asc(feedback.createdAt));
}

/**
 * Feedback geben darf man, wenn der Fotograf es beim Foto wünscht – oder wenn
 * beide in einer laufenden Feedback-Runde des Themas mitmachen.
 */
export async function canGiveFeedback(photo: Photo, viewer: User, now: Date) {
	if (photo.userId === viewer.id || !isPhotoPublic(photo.day, now)) return false;
	if (photo.feedbackWanted) return true;
	const round = await getActiveRound(photo.themeId, now);
	if (!round || !inRoundScope(round, photo.day)) return false;
	return (await isParticipating(round, photo.userId)) && (await isParticipating(round, viewer.id));
}

export async function addFeedback(photoId: number, authorId: number, body: string) {
	await db.insert(feedback).values({ photoId, authorId, body });
}

/** Löschen dürfen Verfasser und Empfänger. */
export async function deleteFeedback(id: number, viewer: User) {
	const [row] = await db
		.select({ id: feedback.id, authorId: feedback.authorId, ownerId: photos.userId })
		.from(feedback)
		.innerJoin(photos, eq(feedback.photoId, photos.id))
		.where(eq(feedback.id, id));
	if (row && (row.authorId === viewer.id || row.ownerId === viewer.id)) {
		await db.delete(feedback).where(eq(feedback.id, id));
	}
}

// -------------------------------------------------------------- Feedback-Runden

/** Eine Runde behandelt die Fotos der vergangenen sieben Tage vor ihrem Start. */
const roundDays = (round: FeedbackRound) => feedbackRoundDays(round.startsAt);

const inRoundScope = (round: FeedbackRound, day: string) => {
	const { from, to } = roundDays(round);
	return day >= from && day <= to;
};

/** Legt die nächste automatische Runde an (falls im Thema ein Rhythmus eingestellt ist). */
async function ensureAutoRound(theme: Theme, now: Date) {
	const next = autoFeedbackRound(theme, now);
	if (next) {
		await db
			.insert(feedbackRounds)
			.values({ themeId: theme.id, ...next })
			.onConflictDoNothing();
	}
}

/** Die laufende oder als Nächstes anstehende Runde eines Themas. */
export async function getCurrentRound(theme: Theme, now: Date) {
	await ensureAutoRound(theme, now);
	const [round] = await db
		.select()
		.from(feedbackRounds)
		.where(and(eq(feedbackRounds.themeId, theme.id), gt(feedbackRounds.endsAt, now)))
		.orderBy(asc(feedbackRounds.startsAt))
		.limit(1);
	return round ?? null;
}

async function getActiveRound(themeId: number, now: Date) {
	const [round] = await db
		.select()
		.from(feedbackRounds)
		.where(and(eq(feedbackRounds.themeId, themeId), gt(feedbackRounds.endsAt, now)))
		.orderBy(asc(feedbackRounds.startsAt))
		.limit(1);
	return round && round.startsAt <= now ? round : null;
}

export async function startManualRound(themeId: number, hours: number) {
	const startsAt = new Date();
	await db
		.insert(feedbackRounds)
		.values({ themeId, startsAt, endsAt: new Date(startsAt.getTime() + hours * 3_600_000) });
}

export async function endRound(roundId: number) {
	await db.update(feedbackRounds).set({ endsAt: new Date() }).where(eq(feedbackRounds.id, roundId));
}

/**
 * Teilnahme: eine ausdrückliche Antwort für die Runde zählt; sonst gilt
 * die Einstellung «immer mitmachen» der Themen-Mitgliedschaft.
 * Gibt `null` zurück, wenn der User sich noch nicht entschieden hat.
 */
export async function getParticipation(round: FeedbackRound, userId: number) {
	const [answer] = await db
		.select({ participating: feedbackRoundMembers.participating })
		.from(feedbackRoundMembers)
		.where(
			and(eq(feedbackRoundMembers.roundId, round.id), eq(feedbackRoundMembers.userId, userId))
		);
	if (answer) return answer.participating;
	const [member] = await db
		.select({ always: themeMembers.feedbackAlways })
		.from(themeMembers)
		.where(
			and(
				eq(themeMembers.themeId, round.themeId),
				eq(themeMembers.userId, userId),
				isNull(themeMembers.leftAt)
			)
		);
	return member?.always ? true : null;
}

async function isParticipating(round: FeedbackRound, userId: number) {
	return (await getParticipation(round, userId)) === true;
}

export async function setParticipation(
	round: FeedbackRound,
	userId: number,
	participating: boolean,
	always = false
) {
	if (!(await isMember(round.themeId, userId))) return;
	await db
		.insert(feedbackRoundMembers)
		.values({ roundId: round.id, userId, participating })
		.onConflictDoUpdate({
			target: [feedbackRoundMembers.roundId, feedbackRoundMembers.userId],
			set: { participating }
		});
	if (always || !participating) {
		// «Immer mitmachen» merken bzw. bei einer Absage wieder entfernen
		await db
			.update(themeMembers)
			.set({ feedbackAlways: always })
			.where(
				and(
					eq(themeMembers.themeId, round.themeId),
					eq(themeMembers.userId, userId),
					isNull(themeMembers.leftAt)
				)
			);
	}
}

/** Alle Teilnehmenden einer Runde (Antwort «ja» oder «immer mitmachen»). */
async function roundParticipants(round: FeedbackRound) {
	const members = await db
		.select({ userId: themeMembers.userId, always: themeMembers.feedbackAlways })
		.from(themeMembers)
		.where(and(eq(themeMembers.themeId, round.themeId), isNull(themeMembers.leftAt)));
	const answers = await db
		.select()
		.from(feedbackRoundMembers)
		.where(eq(feedbackRoundMembers.roundId, round.id));
	const ids = new Set<number>();
	for (const m of members) {
		const answer = answers.find((a) => a.userId === m.userId);
		if (answer ? answer.participating : m.always) ids.add(m.userId);
	}
	return [...ids];
}

/** Fotos der anderen Teilnehmenden, inkl. ob der Betrachter schon Feedback gegeben hat. */
export async function getRoundPhotos(round: FeedbackRound, viewerId: number, now: Date) {
	const participants = (await roundParticipants(round)).filter((id) => id !== viewerId);
	if (participants.length === 0) return { others: 0, photos: [] };
	const { from, to } = roundDays(round);
	const rows = await db
		.select(photoColumns)
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.where(
			and(
				eq(photos.themeId, round.themeId),
				inArray(photos.userId, participants),
				between(photos.day, from, to)
			)
		);
	const visible = rows.filter((r) => isPhotoPublic(r.day, now));
	const given = visible.length
		? await db
				.select({ photoId: feedback.photoId })
				.from(feedback)
				.where(
					and(
						eq(feedback.authorId, viewerId),
						inArray(
							feedback.photoId,
							visible.map((r) => r.id)
						)
					)
				)
		: [];
	const givenIds = new Set(given.map((g) => g.photoId));
	const decorated = await decorate(visible, viewerId, now);
	const result = decorated
		.map((p) => ({ ...p, feedbackGiven: givenIds.has(p.id) }))
		.sort((a, b) => b.day.localeCompare(a.day));
	return { others: participants.length, photos: result };
}
