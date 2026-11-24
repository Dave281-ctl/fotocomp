// Führt beim Start alle ausstehenden Datenbank-Migrationen aus –
// und sichert die Datenbank vorher, falls sich etwas ändert.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { backupDatabase, pendingMigrations } from './backup.js';
import { connect } from './db-connection.js';

const client = connect({ max: 1 });
try {
	const pending = await pendingMigrations(client);
	if (pending > 0) {
		try {
			const file = await backupDatabase();
			console.log(`Sicherung vor ${pending} Migration(en) erstellt: ${file}`);
		} catch (e) {
			// Lokal ohne pg_dump weitermachen; im Betrieb lieber nicht ohne Sicherung migrieren.
			if (e?.code === 'ENOENT' && process.env.NODE_ENV !== 'production') {
				console.warn('pg_dump nicht gefunden – Sicherung übersprungen (nur in der Entwicklung).');
			} else {
				console.error(
					'\nDie Datenbank konnte vor dem Update nicht gesichert werden. Aus Sicherheit\n' +
						'wird nicht migriert. Häufige Ursache: kein Platz auf dem Datenträger.\n'
				);
				throw e;
			}
		}
	}
	await migrate(drizzle(client), { migrationsFolder: './drizzle' });
	console.log('Datenbank-Migrationen ausgeführt');
} catch (e) {
	if (e?.cause?.code === '28P01') {
		console.error(
			'\nAnmeldung an der Datenbank fehlgeschlagen: Das Passwort stimmt nicht.\n' +
				'Hinweis: POSTGRES_PASSWORD gilt nur beim allerersten Start (leerer db-Ordner).\n' +
				'Wurde das Passwort danach geändert, den db-Ordner leeren oder das Passwort\n' +
				'in der Datenbank anpassen (siehe README, «Fehlerbehebung»).\n'
		);
	}
	throw e;
} finally {
	await client.end();
}
