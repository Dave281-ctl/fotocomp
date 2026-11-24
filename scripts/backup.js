// Sicherung der Datenbank vor Migrationen.
//
// Stehen beim Start neue Migrationen an (also nach einem Update, das die
// Datenbank verändert), wird vorher eine komprimierte Sicherung erstellt:
//   <DATA_DIR>/backups/fotocomp-<datum>-vor-<version>.sql.gz
// Die letzten fünf bleiben erhalten. Zurückspielen: siehe README.
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

const KEEP = 5;

/** Wie viele Migrationen sind noch nicht ausgeführt? (0 bei leerer Datenbank: nichts zu sichern) */
export async function pendingMigrations(client) {
	const journal = JSON.parse(readFileSync('./drizzle/meta/_journal.json', 'utf8'));
	const [{ exists }] =
		await client`select to_regclass('drizzle.__drizzle_migrations') is not null as exists`;
	if (!exists) return 0;
	const [{ done }] = await client`select count(*)::int as done from drizzle.__drizzle_migrations`;
	return Math.max(0, journal.entries.length - done);
}

/** Verbindungsdaten für pg_dump, aus denselben Variablen wie die App. */
function pgEnv() {
	const env = process.env;
	if (env.DATABASE_URL) {
		const url = new URL(env.DATABASE_URL);
		return {
			PGHOST: url.hostname,
			PGPORT: url.port || '5432',
			PGUSER: decodeURIComponent(url.username),
			PGPASSWORD: decodeURIComponent(url.password),
			PGDATABASE: url.pathname.slice(1)
		};
	}
	return {
		PGHOST: env.DB_HOST ?? 'db',
		PGPORT: env.DB_PORT ?? '5432',
		PGUSER: env.DB_USER ?? 'fotocomp',
		PGPASSWORD: env.DB_PASSWORD,
		PGDATABASE: env.DB_NAME ?? 'fotocomp'
	};
}

export async function backupDatabase() {
	const dir = join(process.env.DATA_DIR ?? './data', 'backups');
	mkdirSync(dir, { recursive: true });
	const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
	const version = (process.env.APP_VERSION ?? 'dev').replace(/[^\w.-]/g, '');
	const file = join(dir, `fotocomp-${stamp}-vor-${version}.sql.gz`);

	const dump = spawn('pg_dump', ['--no-owner', '--no-privileges'], {
		env: { ...process.env, ...pgEnv() },
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let stderr = '';
	dump.stderr.on('data', (d) => (stderr += d));
	const exited = new Promise((resolve, reject) => {
		dump.on('error', reject);
		dump.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`pg_dump fehlgeschlagen: ${stderr.trim()}`))
		);
	});
	try {
		await Promise.all([pipeline(dump.stdout, createGzip(), createWriteStream(file)), exited]);
	} catch (e) {
		rmSync(file, { force: true });
		throw e;
	}

	// Nur die neuesten Sicherungen behalten
	const old = readdirSync(dir)
		.filter((f) => /^fotocomp-.*\.sql\.gz$/.test(f))
		.sort()
		.slice(0, -KEEP);
	for (const f of old) rmSync(join(dir, f));
	return file;
}
