<script lang="ts">
	let { name, id = 0, size = 26 }: { name: string; id?: number | null; size?: number } = $props();

	const initials = $derived(
		name
			.split(/\s+/)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
	// Dezente, pro Person gleichbleibende Farbe
	const hue = $derived(((id ?? 0) * 47) % 360);
</script>

<span class="avatar" style="--size: {size}px; --hue: {hue}" aria-hidden="true">{initials}</span>

<style>
	.avatar {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		font-size: calc(var(--size) * 0.4);
		font-weight: 600;
		letter-spacing: 0.02em;
		color: hsl(var(--hue) 35% 88%);
		background: hsl(var(--hue) 22% 30%);
	}

	:global([data-theme='light']) .avatar {
		color: hsl(var(--hue) 35% 25%);
		background: hsl(var(--hue) 30% 86%);
	}
</style>
