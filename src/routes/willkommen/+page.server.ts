import { fail, redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { themePhase } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { themes, users } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import {
	canCreateTheme,
	getMemberships,
	getTheme,
	joinTheme,
	memberCount
} from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const t = now();
	const open = (await db.select().from(themes).orderBy(desc(themes.startDate))).filter(
		(theme) => themePhase(theme, t).kind !== 'ended'
	);
	return {
		/** Bereits eingeführt: Einführung nur zum Nachlesen, ohne Themenwahl. */
		review: !!user.onboardedAt,
		name: user.name,
		canCreate: await canCreateTheme(user),
		themes: await Promise.all(
			open.map(async (theme) => ({
				id: theme.id,
				title: theme.title,
				description: theme.description,
				upcoming: themePhase(theme, t).kind === 'upcoming',
				members: await memberCount(theme.id)
			}))
		)
	};
};

async function finish(userId: number) {
	await db.update(users).set({ onboardedAt: new Date() }).where(eq(users.id, userId));
}

export const actions: Actions = {
	/** Einführung abschliessen und beim gewählten Thema mitmachen – genau eines. */
	start: async ({ request, locals }) => {
		const user = locals.user!;
		const theme = await getTheme(Number((await request.formData()).get('theme')));
		if (themePhase(theme, now()).kind === 'ended') {
			return fail(400, { error: 'Dieses Thema ist schon beendet.' });
		}
		if ((await getMemberships(user.id)).length === 0) await joinTheme(theme.id, user.id);
		await finish(user.id);
		redirect(303, `/themen/${theme.id}`);
	},

	/** Noch kein Thema vorhanden: abschliessen, ggf. direkt ein Thema erstellen. */
	finish: async ({ request, locals }) => {
		const user = locals.user!;
		await finish(user.id);
		const create = (await request.formData()).get('create') === '1';
		redirect(303, create && (await canCreateTheme(user)) ? '/themen/neu' : '/');
	}
};
