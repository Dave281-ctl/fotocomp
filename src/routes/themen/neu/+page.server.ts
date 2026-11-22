import { error, fail, redirect } from '@sveltejs/kit';
import { gameDay } from '#lib/schedule.ts';
import { db } from '#lib/server/db.ts';
import { themes } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import { canCreateTheme, joinTheme, parseThemeForm } from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!(await canCreateTheme(locals.user!))) error(403, 'Nur Admins dürfen Themen erstellen.');
	return { today: gameDay(now()) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user!;
		if (!(await canCreateTheme(user))) error(403);
		const { values, error: message } = parseThemeForm(await request.formData());
		if (message) return fail(400, { values, error: message });

		const [theme] = await db
			.insert(themes)
			.values({ ...values, createdBy: user.id })
			.returning();
		// Wer ein Thema erstellt, macht automatisch mit.
		await joinTheme(theme.id, user.id);
		redirect(303, `/themen/${theme.id}`);
	}
};
