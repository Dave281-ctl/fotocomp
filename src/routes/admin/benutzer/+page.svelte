<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const date = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' });
</script>

<svelte:head><title>Benutzer · Admin · Fotocomp</title></svelte:head>

{#if form?.error}<p class="error">{form.error}</p>{/if}
{#if form?.info}<p class="notice">{form.info}</p>{/if}

<div class="scroll">
	<table>
		<thead>
			<tr>
				<th>Name</th>
				<th>E-Mail</th>
				<th>Fotos</th>
				<th>Seit</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.users as user (user.id)}
				<tr class:disabled={user.disabled}>
					<td>
						<a href="/admin/fotos?user={user.id}">{user.name}</a>
						{#if user.role === 'admin'}<span class="badge accent">Admin</span>{/if}
						{#if user.disabled}<span class="badge">Gesperrt</span>{/if}
					</td>
					<td class="muted">{user.email}</td>
					<td>{user.photos ?? 0}</td>
					<td class="muted">{date.format(user.createdAt)}</td>
					<td>
						<form method="POST" class="actions" use:enhance>
							<input type="hidden" name="id" value={user.id} />
							{#if user.role === 'admin'}
								<button class="btn ghost small" formaction="?/removeAdmin">Admin entziehen</button>
							{:else}
								<button class="btn ghost small" formaction="?/makeAdmin">Zum Admin machen</button>
							{/if}
							{#if user.id !== data.user?.id}
								<button class="btn ghost small" formaction="?/toggleDisabled">
									{user.disabled ? 'Entsperren' : 'Sperren'}
								</button>
							{/if}
							<button class="btn ghost small" formaction="?/endSessions">Abmelden</button>
							{#if user.id !== data.user?.id}
								<button
									class="btn danger small"
									formaction="?/delete"
									onclick={(e) => {
										if (!confirm(`${user.name} mit allen Fotos endgültig löschen?`)) {
											e.preventDefault();
										}
									}}
								>
									Löschen
								</button>
							{/if}
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroll {
		overflow-x: auto;
	}

	td .badge {
		margin-left: 6px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 2px;
	}

	tr.disabled td:first-child a {
		opacity: 0.5;
	}
</style>
