import type { User } from './schema.ts';
import { hasOpenTask } from './theme-status.ts';
import { getMemberships } from './themes.ts';

/** Die Reiter «meine Themen», mit Punkt wo noch etwas offen ist. */
export async function themeTabs(user: User, t: Date) {
	const memberships = await getMemberships(user.id);
	return Promise.all(
		memberships.map(async ({ theme }) => ({
			id: theme.id,
			title: theme.title,
			todo: await hasOpenTask(theme, user, t)
		}))
	);
}
