/**
 * Android/Chrome bietet die Installation per Ereignis an («beforeinstallprompt»).
 * Es kommt früh beim Laden einer Seite, darum wird es hier global aufgefangen.
 */
interface InstallEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const install = $state<{ event: InstallEvent | null; installed: boolean }>({
	event: null,
	installed: false
});

let listening = false;
export function listenForInstall() {
	if (listening) return;
	listening = true;
	addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		install.event = e as InstallEvent;
	});
	addEventListener('appinstalled', () => {
		install.event = null;
		install.installed = true;
	});
}

export async function promptInstall() {
	const e = install.event;
	if (!e) return;
	await e.prompt();
	if ((await e.userChoice).outcome === 'accepted') install.installed = true;
	install.event = null;
}
