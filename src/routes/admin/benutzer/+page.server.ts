import { fail } from '@sveltejs/kit';
import { asc, count, eq } from 'drizzle-orm';
import { deleteUser, setRole } from '#lib/server/admin.ts';
import { deleteUserSessions } from '#lib/server/auth.ts';
import { db } from '#lib/server/db.ts';
import { photos, users } from '#lib/server/schema.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const photoCounts = db
		.select({ userId: photos.userId, n: count().as('n') })
		.from(photos)
		.groupBy(photos.userId)
		.as('pc');
	const list = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			disabled: users.disabled,
			createdAt: users.createdAt,
			photos: photoCounts.n
		})
		.from(users)
		.leftJoin(photoCounts, eq(photoCounts.userId, users.id))
		.orderBy(asc(users.createdAt));
	return { users: list };
};

/** Liest die Ziel-User-ID und verhindert Aktionen gegen sich selbst, wo nötig. */
async function target(request: Request) {
	const id = Number((await request.formData()).get('id'));
	const [user] = await db.select().from(users).where(eq(users.id, id));
	return user;
}

export const actions: Actions = {
	makeAdmin: async ({ request }) => {
		const user = await target(request);
		if (user) await setRole(user.id, 'admin');
	},
	removeAdmin: async ({ request }) => {
		const user = await target(request);
		const error = user && (await setRole(user.id, 'user'));
		if (error) return fail(400, { error });
	},
	toggleDisabled: async ({ request, locals }) => {
		const user = await target(request);
		if (!user || user.id === locals.user!.id) return fail(400, { error: 'Nicht möglich.' });
		await db.update(users).set({ disabled: !user.disabled }).where(eq(users.id, user.id));
		if (!user.disabled) await deleteUserSessions(user.id);
	},
	endSessions: async ({ request }) => {
		const user = await target(request);
		if (user) await deleteUserSessions(user.id);
		return { info: `Alle Sessions von ${user?.name} wurden beendet.` };
	},
	delete: async ({ request, locals }) => {
		const user = await target(request);
		if (!user || user.id === locals.user!.id) {
			return fail(400, { error: 'Du kannst dich nicht selbst löschen.' });
		}
		if (user.role === 'admin') {
			const error = await setRole(user.id, 'user');
			if (error) return fail(400, { error });
		}
		await deleteUser(user);
	}
};
