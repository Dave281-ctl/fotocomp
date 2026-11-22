import type { Cookies } from '@sveltejs/kit';
import { getMemberships } from './themes.ts';

const COOKIE = 'thema';

/**
 * Wählt das angezeigte Thema: aus der Adresse (?thema=…), sonst das zuletzt
 * gewählte (Cookie), sonst das erste. Liefert alle eigenen Themen mit.
 */
export async function selectTheme(userId: number, url: URL, cookies: Cookies) {
	const memberships = await getMemberships(userId);
	const fromUrl = Number(url.searchParams.get(COOKIE));
	const fromCookie = Number(cookies.get(COOKIE));
	const current =
		memberships.find((m) => m.theme.id === fromUrl) ??
		memberships.find((m) => m.theme.id === fromCookie) ??
		memberships[0] ??
		null;
	if (current && current.theme.id === fromUrl && fromUrl !== fromCookie) {
		cookies.set(COOKIE, String(fromUrl), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
	}
	return { memberships, current };
}
