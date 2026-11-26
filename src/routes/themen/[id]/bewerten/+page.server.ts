import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Bewertet wird auf einer Seite für alle Themen – hier zum Abschnitt dieses Themas. */
export const load: PageServerLoad = ({ params }) => redirect(303, `/bewerten#thema-${params.id}`);
