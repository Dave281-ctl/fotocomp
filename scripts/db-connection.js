// Gemeinsame Datenbankverbindung für App und Migrationen.
//
// Entweder DATABASE_URL setzen (postgres://user:passwort@host:5432/db)
// oder einzeln: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
// Die einzelnen Werte sind einfacher, weil Sonderzeichen im Passwort
// nicht URL-kodiert werden müssen.
import postgres from 'postgres';

/** @param {import('postgres').Options<{}>} [extra] */
export function connect(extra = {}) {
	const env = process.env;
	const options = { onnotice: () => {}, ...extra };
	if (env.DATABASE_URL) return postgres(env.DATABASE_URL, options);
	if (!env.DB_PASSWORD) throw new Error('DATABASE_URL oder DB_PASSWORD fehlt');
	return postgres({
		host: env.DB_HOST ?? 'db',
		port: Number(env.DB_PORT ?? 5432),
		user: env.DB_USER ?? 'fotocomp',
		password: env.DB_PASSWORD,
		database: env.DB_NAME ?? 'fotocomp',
		...options
	});
}
