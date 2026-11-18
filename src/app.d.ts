import type { User } from '#lib/server/schema.ts';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			theme: 'dark' | 'light';
		}
	}
}

export {};
