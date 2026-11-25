/**
 * Benutzerseite: enthüllte Fotos einer Person, ihre Erfolge und Kameras.
 * Fotos, die gerade anonym bewertet werden, fehlen hier bewusst – sonst
 * liesse sich über diese Seite herausfinden, wer welches Foto gemacht hat.
 */
import { and, eq, lte } from 'drizzle-orm';
import { cameraStats } from '../camera-stats.ts';
import { addDays, gameDay } from '../schedule.ts';
import { isWow, wowOrder } from '../wow.ts';
import { db } from './db.ts';
import { decorate, getWinners, photoColumns } from './gallery.ts';
import { photos, themes, users } from './schema.ts';
import { getMemberships } from './themes.ts';

export async function getPerson(personId: number, viewerId: number, t: Date) {
	if (!Number.isInteger(personId)) return null;
	const [person] = await db
		.select({
			id: users.id,
			name: users.name,
			createdAt: users.createdAt,
			disabled: users.disabled
		})
		.from(users)
		.where(eq(users.id, personId));
	if (!person || person.disabled) return null;

	// Enthüllt sind alle Tage vor dem laufenden Wettbewerbstag
	const lastDay = addDays(gameDay(t), -1);
	const rows = await db
		.select({ ...photoColumns, exif: photos.exif, themeTitle: themes.title })
		.from(photos)
		.innerJoin(users, eq(photos.userId, users.id))
		.innerJoin(themes, eq(photos.themeId, themes.id))
		.where(and(eq(photos.userId, person.id), lte(photos.day, lastDay)));

	const badges = rows.length ? await getWinners(lastDay, t) : new Map();
	const titles = new Map(rows.map((r) => [r.themeId, r.themeTitle]));
	const all = (await decorate(rows, viewerId, t)).map((p) => ({
		...p,
		badge: badges.get(p.id) ?? null,
		theme: { id: p.themeId, title: titles.get(p.themeId) ?? '' }
	}));

	const highlights = all.filter(isWow).sort(wowOrder);
	const rest = all
		.filter((p) => !isWow(p))
		.sort((a, b) => b.day.localeCompare(a.day) || a.themeId - b.themeId);

	return {
		person: { id: person.id, name: person.name, since: person.createdAt },
		themes: (await getMemberships(person.id)).map((m) => ({
			id: m.theme.id,
			title: m.theme.title
		})),
		stats: {
			photos: all.length,
			dayWins: all.filter((p) => p.rank === 1 && p.votes).length,
			weekWins: all.filter((p) => p.badge === 'week').length
		},
		cameras: cameraStats(rows.map((r) => r.exif)),
		highlights,
		rest
	};
}
