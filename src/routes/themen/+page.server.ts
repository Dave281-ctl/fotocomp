import { fail } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { themePhase } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { themes } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import {
	canCreateTheme,
	getMemberships,
	getTheme,
	joinTheme,
	leaveTheme,
	memberCount
} from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const t = now();
	const all = await db.select().from(themes).orderBy(desc(themes.startDate));
	const mine = (await getMemberships(user.id)).map((m) => m.theme.id);

	const withInfo = await Promise.all(
		all.map(async (theme) => ({
			...theme,
			phase: themePhase(theme, t).kind,
			members: await memberCount(theme.id)
		}))
	);
	return {
		open: withInfo.filter((x) => x.phase !== 'ended'),
		past: withInfo.filter((x) => x.phase === 'ended'),
		myThemeIds: mine,
		canCreate: await canCreateTheme(user)
	};
};

export const actions: Actions = {
	join: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		const theme = await getTheme(id);
		if (themePhase(theme, now()).kind === 'ended')
			return fail(400, { error: 'Thema ist beendet.' });
		await joinTheme(theme.id, locals.user!.id);
	},
	leave: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		await leaveTheme(id, locals.user!.id);
	}
};
