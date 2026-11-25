import { redirect } from '@sveltejs/kit';
import { themeChat } from '#lib/server/chat.ts';
import { getTheme } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

/** Chat eines Themas öffnen (Zugriff prüft dann die Chatseite). */
export const load: PageServerLoad = async ({ params }) => {
	const theme = await getTheme(Number(params.themeId));
	redirect(303, `/chat/${(await themeChat(theme.id)).id}`);
};
