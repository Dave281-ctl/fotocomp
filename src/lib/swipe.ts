/**
 * Wischen auf dem Handy (Svelte-Action): nach links oder rechts ziehen,
 * ab einer Schwelle löst es eine Aktion aus. Vertikales Scrollen bleibt frei;
 * langes Drücken (ohne Bewegung) meldet `onlong`.
 *
 *   <div use:swipe={{ onleft, onright, onlong, onmove }}>
 */
export interface SwipeOptions {
	onleft?: () => void;
	onright?: () => void;
	onlong?: () => void;
	/** Laufende Verschiebung in px (für die Anzeige), 0 am Ende. */
	onmove?: (dx: number) => void;
	threshold?: number;
	max?: number;
}

export function swipe(node: HTMLElement, initial: SwipeOptions) {
	let opts = initial;
	let startX = 0;
	let startY = 0;
	let dx = 0;
	let active = false;
	let decided: 'h' | 'v' | null = null;
	let longTimer: ReturnType<typeof setTimeout> | undefined;

	const reset = () => {
		clearTimeout(longTimer);
		active = false;
		decided = null;
		dx = 0;
		opts.onmove?.(0);
	};

	function start(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		startX = e.touches[0].clientX;
		startY = e.touches[0].clientY;
		dx = 0;
		active = true;
		decided = null;
		if (opts.onlong)
			longTimer = setTimeout(() => (active ? (reset(), opts.onlong?.()) : null), 450);
	}

	function move(e: TouchEvent) {
		if (!active) return;
		const x = e.touches[0].clientX - startX;
		const y = e.touches[0].clientY - startY;
		if (Math.abs(x) > 8 || Math.abs(y) > 8) clearTimeout(longTimer);
		if (!decided && (Math.abs(x) > 10 || Math.abs(y) > 10)) {
			decided = Math.abs(x) > Math.abs(y) * 1.3 ? 'h' : 'v';
		}
		if (decided !== 'h') return;
		const max = opts.max ?? 80;
		// Nur in Richtungen ziehen, für die es eine Aktion gibt
		dx = Math.max(opts.onleft ? -max : 0, Math.min(opts.onright ? max : 0, x));
		opts.onmove?.(dx);
		if (e.cancelable) e.preventDefault();
	}

	function end() {
		if (!active) return;
		const threshold = opts.threshold ?? 56;
		const action = dx >= threshold ? opts.onright : dx <= -threshold ? opts.onleft : undefined;
		reset();
		action?.();
	}

	node.addEventListener('touchstart', start, { passive: true });
	node.addEventListener('touchmove', move, { passive: false });
	node.addEventListener('touchend', end);
	node.addEventListener('touchcancel', reset);
	return {
		update(next: SwipeOptions) {
			opts = next;
		},
		destroy() {
			clearTimeout(longTimer);
			node.removeEventListener('touchstart', start);
			node.removeEventListener('touchmove', move);
			node.removeEventListener('touchend', end);
			node.removeEventListener('touchcancel', reset);
		}
	};
}
