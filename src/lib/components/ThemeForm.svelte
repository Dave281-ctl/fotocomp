<script lang="ts">
	import { WEEKDAYS } from '../schedule.ts';

	interface Values {
		title: string;
		description: string;
		startDate: string;
		endDate: string | null;
		weeklyVoteDay: number | null;
		feedbackDay: number | null;
		feedbackTime: string | null;
		feedbackHours: number;
	}

	let { values, error, submitLabel }: { values: Values; error?: string; submitLabel: string } =
		$props();

	// svelte-ignore state_referenced_locally
	let mode = $state(values.endDate ? 'fixed' : 'recurring');
	// svelte-ignore state_referenced_locally
	let feedbackDay = $state(values.feedbackDay ? String(values.feedbackDay) : '');
</script>

<form method="POST" class="stack" style="--gap: 22px">
	<label>
		Thema
		<input type="text" name="title" value={values.title} placeholder="z.B. Holz" required />
	</label>
	<label>
		Beschreibung
		<textarea
			name="description"
			rows="3"
			placeholder="z.B. Stelle Holz in verschiedensten Formen im Herbst dar."
			>{values.description}</textarea
		>
	</label>

	<div class="grid">
		<label>
			Start
			<input type="date" name="startDate" value={values.startDate} required />
		</label>
		<label>
			Dauer
			<select name="mode" bind:value={mode}>
				<option value="fixed">Bis zu einem Enddatum</option>
				<option value="recurring">Wiederkehrend, ohne Ende</option>
			</select>
		</label>
		{#if mode === 'fixed'}
			<label>
				Ende (letzter Upload-Tag)
				<input type="date" name="endDate" value={values.endDate ?? ''} required />
			</label>
		{/if}
	</div>

	<label>
		Wochenbewertung
		<select name="weeklyVoteDay">
			<option value="">Keine</option>
			{#each WEEKDAYS as day, i (day)}
				<option value={i + 1} selected={values.weeklyVoteDay === i + 1}>Jeden {day}</option>
			{/each}
		</select>
	</label>

	<div class="grid">
		<label>
			Automatische Feedback-Runde
			<select name="feedbackDay" bind:value={feedbackDay}>
				<option value="">Keine</option>
				{#each WEEKDAYS as day, i (day)}
					<option value={String(i + 1)}>Jeden {day}</option>
				{/each}
			</select>
		</label>
		{#if feedbackDay}
			<label>
				Beginn
				<input type="time" name="feedbackTime" value={values.feedbackTime ?? '19:00'} required />
			</label>
			<label>
				Dauer (Stunden)
				<input type="number" name="feedbackHours" min="1" max="168" value={values.feedbackHours} />
			</label>
		{/if}
	</div>

	{#if error}<p class="error">{error}</p>{/if}
	<div class="row">
		<button class="btn primary">{submitLabel}</button>
		<a class="btn ghost" href="/themen">Abbrechen</a>
	</div>
</form>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 16px;
	}
</style>
