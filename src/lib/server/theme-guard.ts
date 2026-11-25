import { redirect } from '@sveltejs/kit';
import { getMembership } from './themes.ts';

/** Unterseiten zum Mitmachen (Hochladen, Bewerten …) nur für Teilnehmende – sonst zum Thema. */
export async function requireMembership(userId: number, themeId: number) {
	const membership = await getMembership(userId, themeId);
	if (!membership) redirect(303, `/themen/${themeId}`);
	return membership;
}
