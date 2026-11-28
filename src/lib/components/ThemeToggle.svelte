<script lang="ts">
	let { theme }: { theme: 'dark' | 'light' } = $props();
	let current = $derived(theme);

	const options = [
		{ value: 'dark', label: 'Dunkel' },
		{ value: 'light', label: 'Hell' }
	] as const;

	async function choose(value: 'dark' | 'light') {
		if (value === current) return;
		current = value;
		document.documentElement.dataset.theme = value;
		await fetch('/theme', { method: 'POST', body: JSON.stringify({ theme: value }) });
	}
</script>

<!-- Erscheinungsbild als Auswahl mit zwei Feldern («Auto» folgt später) -->
<div class="segmented" role="group" aria-label="Erscheinungsbild">
	{#each options as option (option.value)}
		<button
			type="button"
			aria-pressed={current === option.value}
			onclick={() => choose(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>

<style>
	.segmented {
		display: flex;
		gap: 2px;
		padding: 3px;
		border-radius: 10px;
		background: var(--surface-2);
	}

	button {
		border: 0;
		padding: 7px 12px;
		border-radius: 8px;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}

	button[aria-pressed='true'] {
		background: var(--tabbar-active);
		color: var(--text);
		font-weight: 800;
	}

	:global([data-theme='light']) button[aria-pressed='true'] {
		background: var(--surface);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
	}
</style>
