import { and, between, eq } from 'drizzle-orm';
import { addDays, isRevealed, themePhase } from '../schedule.ts';
import { rankPhotographers, rankWeekly } from '../scoring.ts';
import { db } from './db.ts';
import { decorate } from './gallery.ts';
import { photos, users, weeklyVotes, type Theme } from './schema.ts';
import { isMember } from './themes.ts';

/** Punkte für Platz 1, 2 und 3. */
export const WEEKLY_POINTS = [3, 2, 1] as const;

/** Alle Fotos der Woche vor dem Wochenbewertungstag. */
export async function getWeekPhotos(themeId: number, voteDay: string, viewerId: number, now: Date) {
	const rows = await db
		.select({
			id: photos.id,
			day: photos.day,
			width: photos.width,
			height: photos.height,
			userId: photos.userId,
			feedbackWanted: photos.feedbackWanted,
			userName: users.name
		})
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.where(
			and(
				eq(photos.themeId, themeId),
				between(photos.day, addDays(voteDay, -6), addDays(voteDay, -1))
			)
		);
	const decorated = await decorate(rows, viewerId, now);
	// Chronologisch, innerhalb eines Tages nach Rang
	return decorated.sort((a, b) => a.day.localeCompare(b.day) || (a.rank ?? 0) - (b.rank ?? 0));
}

/** Die bisherige Wahl eines Users, sortiert nach Platz. */
export async function getMyPicks(themeId: number, voteDay: string, userId: number) {
	const rows = await db
		.select({ photoId: weeklyVotes.photoId, points: weeklyVotes.points })
		.from(weeklyVotes)
		.where(
			and(
				eq(weeklyVotes.themeId, themeId),
				eq(weeklyVotes.voteDay, voteDay),
				eq(weeklyVotes.voterId, userId)
			)
		);
	return rows.sort((a, b) => b.points - a.points).map((r) => r.photoId);
}

/** Speichert die Top 3 eines Users. Gibt eine Fehlermeldung zurück, falls ungültig. */
export async function savePicks(
	theme: Theme,
	userId: number,
	picks: number[],
	now: Date
): Promise<string | null> {
	const phase = themePhase(theme, now);
	if (phase.kind !== 'weekly') return 'Die Wochenbewertung ist nicht offen.';
	if (!(await isMember(theme.id, userId))) return 'Du machst bei diesem Thema nicht mit.';
	if (picks.length > 3 || new Set(picks).size !== picks.length)
		return 'Bitte bis zu 3 verschiedene Fotos.';

	const week = await getWeekPhotos(theme.id, phase.day, userId, now);
	const allowed = new Set(week.filter((p) => !p.isOwn).map((p) => p.id));
	if (picks.some((id) => !allowed.has(id))) return 'Diese Auswahl ist nicht möglich.';

	await db.transaction(async (tx) => {
		await tx
			.delete(weeklyVotes)
			.where(
				and(
					eq(weeklyVotes.themeId, theme.id),
					eq(weeklyVotes.voteDay, phase.day),
					eq(weeklyVotes.voterId, userId)
				)
			);
		if (picks.length) {
			await tx.insert(weeklyVotes).values(
				picks.map((photoId, i) => ({
					themeId: theme.id,
					voteDay: phase.day,
					voterId: userId,
					photoId,
					points: WEEKLY_POINTS[i]
				}))
			);
		}
	});
	return null;
}

/** Resultat einer Wochenbewertung (erst nach der Enthüllung). */
export async function getWeeklyResult(
	themeId: number,
	voteDay: string,
	viewerId: number,
	now: Date
) {
	if (!isRevealed(voteDay, now)) return null;
	const week = await getWeekPhotos(themeId, voteDay, viewerId, now);
	if (week.length === 0) return null;

	const votes = await db
		.select({ photoId: weeklyVotes.photoId, points: weeklyVotes.points })
		.from(weeklyVotes)
		.where(and(eq(weeklyVotes.themeId, themeId), eq(weeklyVotes.voteDay, voteDay)));
	const ranking = rankWeekly(
		votes,
		week.map((p) => p.id)
	);
	const byId = new Map(week.map((p) => [p.id, p]));
	const winners = ranking
		.filter((r) => r.rank === 1 && r.points > 0)
		.map((r) => ({ ...byId.get(r.photoId)!, rank: null, average: null, points: r.points }));

	const names = new Map(week.map((p) => [p.userId, p.userName]));
	const photographers = rankPhotographers(
		week.map((p) => ({ userId: p.userId!, average: p.average ?? 0 }))
	).map((r) => ({ ...r, name: names.get(r.userId) ?? '' }));

	return { voteDay, winners, photographers };
}
