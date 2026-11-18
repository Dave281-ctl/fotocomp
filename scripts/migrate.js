// Führt beim Start alle ausstehenden Datenbank-Migrationen aus.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connect } from './db-connection.js';

const client = connect({ max: 1 });
try {
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
