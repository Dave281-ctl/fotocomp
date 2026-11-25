<script lang="ts">
	import { ChevronRight, CircleCheck } from '@lucide/svelte';
	import type { Task } from '../types.ts';

	/** Aufgaben eines Themas: offene deutlich hervorgehoben, erledigte mit Häkchen. */
	let { tasks }: { tasks: Task[] } = $props();
</script>

<ul class="tasks">
	{#each tasks as task (task.kind)}
		<li>
			<a href={task.href} class="task" class:open={!task.done}>
				{#if task.done}
					<CircleCheck size={20} class="icon check" />
				{:else}
					<span class="icon ring" aria-hidden="true"></span>
				{/if}
				<span class="text">
					<span class="title">{task.title}</span>
					<span class="detail">{task.detail}</span>
				</span>
				<ChevronRight size={18} class="chevron" />
			</a>
		</li>
	{/each}
</ul>

<style>
	.tasks {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.task {
		display: grid;
		grid-template-columns: 22px 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		transition: background 0.15s;
	}

	.task:hover {
		background: var(--surface-2);
	}

	/* Offen: goldener Rand und Ring – sofort als «zu tun» erkennbar */
	.task.open {
		background: color-mix(in srgb, var(--accent) 10%, var(--surface));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent);
	}

	.task.open:hover {
		background: color-mix(in srgb, var(--accent) 16%, var(--surface));
	}

	.ring {
		width: 18px;
		height: 18px;
		margin: 1px;
		border-radius: 50%;
		border: 2px solid var(--accent);
		box-shadow: inset 0 0 0 3px var(--surface);
		background: var(--accent);
	}

	.task :global(.check) {
		color: var(--ok);
	}

	.text {
		display: grid;
		gap: 1px;
		min-width: 0;
	}

	.title {
		font-weight: 600;
	}

	.task:not(.open) .title {
		font-weight: 500;
		color: var(--muted);
	}

	.detail {
		font-size: 13px;
		color: var(--muted);
	}

	.task :global(.chevron) {
		color: var(--muted);
	}
</style>
