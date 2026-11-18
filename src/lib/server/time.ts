import { dev } from '$app/env';
import { at } from '../schedule.ts';

/**
 * Aktuelle Zeit. In der Entwicklung lässt sie sich mit FAKE_NOW simulieren,
 * z.B. FAKE_NOW=2026-11-18T20:30 (Zürcher Ortszeit).
 */
export function now(): Date {
	const fake = dev ? process.env.FAKE_NOW : undefined;
	if (fake) {
		const [day, time = '12:00'] = fake.split('T');
		const [h, m] = time.split(':').map(Number);
		return at(day, h, m);
	}
	return new Date();
}
