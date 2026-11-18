<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';

	let { theme }: { theme: 'dark' | 'light' } = $props();
	let current = $derived(theme);

	async function toggle() {
		current = current === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = current;
		await fetch('/theme', { method: 'POST', body: JSON.stringify({ theme: current }) });
	}
</script>

<button
	class="btn ghost"
	onclick={toggle}
	title={current === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
	aria-label="Hell/Dunkel umschalten"
>
	{#if current === 'dark'}<Sun size={18} />{:else}<Moon size={18} />{/if}
</button>
