<script lang="ts">
	/**
	 * Herunterziehen zum Aktualisieren (Handy). Ganz oben auf der Seite nach
	 * unten ziehen: Ein Kreis füllt sich, beim Loslassen werden die Daten der
	 * Seite neu geladen (ohne die ganze Seite neu zu laden).
	 */
	import { invalidateAll } from '$app/navigation';
	import { RefreshCw } from '@lucide/svelte';

	const THRESHOLD = 70; // ab hier wird beim Loslassen aktualisiert
	const MAX = 110;

	let pull = $state(0);
	let refreshing = $state(false);

	$effect(() => {
		let startX = 0;
		let startY: number | null = null;

		// Nicht in der Vollbildansicht (dort ist das Scrollen gesperrt) und nur ganz oben
		const canStart = () =>
			!refreshing && window.scrollY <= 0 && document.body.style.overflow !== 'hidden';

		function onStart(e: TouchEvent) {
			if (e.touches.length !== 1 || !canStart()) return;
			// Bereiche mit eigenem Scrollen (z.B. der Chatverlauf) nicht abfangen
			if ((e.target as Element | null)?.closest?.('[data-no-pull]')) return;
			startX = e.touches[0].clientX;
			startY = e.touches[0].clientY;
		}

		function onMove(e: TouchEvent) {
			if (startY === null) return;
			const dy = e.touches[0].clientY - startY;
			const dx = Math.abs(e.touches[0].clientX - startX);
			// Nach oben, seitlich (z.B. Reiter wischen) oder Seite schon gescrollt: abbrechen
			if (dy <= 0 || dx > dy || window.scrollY > 0) {
				startY = null;
				pull = 0;
				return;
			}
			pull = Math.min(MAX, dy * 0.5);
			if (e.cancelable) e.preventDefault();
		}

		async function onEnd() {
			if (startY === null) return;
			startY = null;
			if (pull < THRESHOLD) {
				pull = 0;
				return;
			}
			refreshing = true;
			pull = THRESHOLD;
			try {
				await invalidateAll();
			} finally {
				refreshing = false;
				pull = 0;
			}
		}

		window.addEventListener('touchstart', onStart, { passive: true });
		window.addEventListener('touchmove', onMove, { passive: false });
		window.addEventListener('touchend', onEnd);
		window.addEventListener('touchcancel', onEnd);
		return () => {
			window.removeEventListener('touchstart', onStart);
			window.removeEventListener('touchmove', onMove);
			window.removeEventListener('touchend', onEnd);
			window.removeEventListener('touchcancel', onEnd);
		};
	});

	const progress = $derived(Math.min(1, pull / THRESHOLD));
</script>

{#if pull > 0 || refreshing}
	<div
		class="ptr"
		class:ready={progress >= 1}
		class:spinning={refreshing}
		style="transform: translate(-50%, {pull - 44}px); opacity: {0.3 + progress * 0.7}"
		role="status"
		aria-label={refreshing ? 'Wird aktualisiert' : 'Zum Aktualisieren loslassen'}
	>
		<span style="transform: rotate({progress * 270}deg)"><RefreshCw size={18} /></span>
	</div>
{/if}

<style>
	.ptr {
		position: fixed;
		top: 0;
		left: 50%;
		z-index: 90;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--surface-2);
		border: 1px solid var(--edge);
		color: var(--muted);
		box-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
		pointer-events: none;
	}

	.ptr span {
		display: grid;
	}

	.ptr.ready {
		color: var(--accent);
	}

	.spinning span {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
