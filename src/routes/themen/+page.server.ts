import { desc } from 'drizzle-orm';
import { themePhase } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { themes } from '#lib/server/schema.ts';
import { themeTabs } from '#lib/server/theme-tabs.ts';
import { now } from '#lib/server/time.ts';
import { themeCovers } from '#lib/server/covers.ts';
import { findPhoto } from '#lib/server/photos.ts';
import { canCreateTheme, getPhase, listMembers } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const t = now();
	const tabs = await themeTabs(user, t);
	const mine = new Set(tabs.map((tab) => tab.id));
	const all = await db.select().from(themes).orderBy(desc(themes.startDate));
	const covers = await themeCovers(
		all.map((theme) => theme.id),
		user.id,
		t
	);
	const list = await Promise.all(
		all.map(async (theme) => {
			const members = await listMembers(theme.id);
			const isMine = mine.has(theme.id);
			// «Dein Foto fehlt»: eigenes Thema, Upload offen, noch kein Foto
			const phase = isMine ? await getPhase(theme, t) : null;
			const missing = phase?.kind === 'upload' && !(await findPhoto(user.id, theme.id, phase.day));
			return {
				id: theme.id,
				title: theme.title,
				description: theme.description,
				startDate: theme.startDate,
				endDate: theme.endDate,
				phase: themePhase(theme, t).kind,
				members: members.length,
				faces: members.filter((m) => m.id !== user.id).slice(0, 4),
				mine: isMine,
				cover: covers.get(theme.id) ?? null,
				missing
			};
		})
	);
	return {
		tabs,
		// Eigene zuerst, dann laufende, dann bald startende
		open: list
			.filter((x) => x.phase !== 'ended')
			.sort(
				(a, b) =>
					Number(b.mine) - Number(a.mine) ||
					Number(a.phase === 'upcoming') - Number(b.phase === 'upcoming')
			),
		past: list.filter((x) => x.phase === 'ended'),
		canCreate: await canCreateTheme(user)
	};
};
