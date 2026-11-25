import { now } from '#lib/server/time.ts';
import { canManageTheme, getMembership, getPhase, getTheme } from '#lib/server/themes.ts';
import type { LayoutServerLoad } from './$types';

/** Gemeinsam für das Thema und alle Unterseiten (Hochladen, Bewerten, Details …). */
export const load: LayoutServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const theme = await getTheme(Number(params.id));
	return {
		theme,
		phase: await getPhase(theme, now()),
		isMine: !!(await getMembership(user.id, theme.id)),
		canManage: canManageTheme(user, theme)
	};
};
