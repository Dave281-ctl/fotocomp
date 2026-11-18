import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const user = locals.user;
	return {
		user: user ? { id: user.id, name: user.name, role: user.role } : null,
		theme: locals.theme
	};
};
