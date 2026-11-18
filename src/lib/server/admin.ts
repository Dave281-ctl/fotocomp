import { rm } from 'node:fs/promises';
import path from 'node:path';
import { and, count, eq, ne } from 'drizzle-orm';
import { config } from './config.ts';
import { db } from './db.ts';
import { deletePhoto } from './photos.ts';
import { photos, users, type User } from './schema.ts';

export async function adminCount() {
	const [{ total }] = await db
		.select({ total: count() })
		.from(users)
		.where(eq(users.role, 'admin'));
	return total;
}

/** Ändert die Rolle. Der letzte Admin kann nicht entfernt werden. */
export async function setRole(userId: number, role: User['role']): Promise<string | null> {
	if (role === 'user') {
		const [others] = await db
			.select({ total: count() })
			.from(users)
			.where(and(eq(users.role, 'admin'), ne(users.id, userId)));
		if (others.total === 0) return 'Es muss mindestens ein Admin bleiben.';
	}
	await db.update(users).set({ role }).where(eq(users.id, userId));
	return null;
}

/** Löscht einen User mit allen Fotos (Datenbank und Dateien). */
export async function deleteUser(user: User) {
	const own = await db.select().from(photos).where(eq(photos.userId, user.id));
	for (const photo of own) await deletePhoto(photo);
	await db.delete(users).where(eq(users.id, user.id));
	await rm(path.resolve(config.dataDir, 'photos', 'originals', user.folder), {
		recursive: true,
		force: true
	});
}
