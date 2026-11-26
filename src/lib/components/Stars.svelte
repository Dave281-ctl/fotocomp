<script lang="ts">
	import { Star } from '@lucide/svelte';

	let {
		value = null,
		onrate,
		size = 22,
		disabled = false
	}: {
		value?: number | null;
		onrate?: (stars: number) => void;
		size?: number;
		disabled?: boolean;
	} = $props();

	// Vorschau beim Darüberfahren – nur mit der Maus. Auf dem Handy würde sie nach
	// dem Antippen «hängen bleiben» und falsche Sterne zeigen.
	let hover = $state<number | null>(null);
	const shown = $derived(hover ?? value ?? 0);
</script>

<div class="stars" role="group" aria-label="Bewertung" onpointerleave={() => (hover = null)}>
	{#each [1, 2, 3, 4, 5] as n (n)}
		<button
			type="button"
			aria-pressed={value === n}
			aria-label="{n} {n === 1 ? 'Stern' : 'Sterne'}"
			class:on={n <= shown}
			{disabled}
			onpointerenter={(e) => !disabled && e.pointerType === 'mouse' && (hover = n)}
			onclick={() => {
				hover = null;
				onrate?.(n);
			}}
		>
			<Star {size} strokeWidth={1.5} fill={n <= shown ? 'currentColor' : 'none'} />
		</button>
	{/each}
</div>

<style>
	.stars {
		display: inline-flex;
		gap: 2px;
	}

	button {
		background: none;
		border: 0;
		padding: 4px;
		cursor: pointer;
		color: var(--muted);
		line-height: 0;
		transition:
			color 0.1s,
			transform 0.1s;
	}

	button.on {
		color: var(--accent);
	}

	button:not(:disabled):active {
		transform: scale(0.85);
	}

	button:disabled {
		cursor: default;
	}
</style>
