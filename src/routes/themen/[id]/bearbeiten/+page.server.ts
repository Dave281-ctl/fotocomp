import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { themes } from '#lib/server/schema.ts';
import { canManageTheme, getTheme, parseThemeForm } from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const theme = await getTheme(Number(params.id));
	if (!canManageTheme(locals.user!, theme)) error(403);
	return { theme };
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const theme = await getTheme(Number(params.id));
		if (!canManageTheme(locals.user!, theme)) error(403);
		const { values, error: message } = parseThemeForm(await request.formData());
		if (message) return fail(400, { values, error: message });
		await db.update(themes).set(values).where(eq(themes.id, theme.id));
		redirect(303, `/themen/${theme.id}`);
	}
};
