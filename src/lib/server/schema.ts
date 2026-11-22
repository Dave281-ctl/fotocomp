import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	serial,
	smallint,
	text,
	timestamp,
	unique,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import type { PhotoExif } from '../types.ts';

export type { PhotoExif };

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/** Registrierte Spieler. Der erste User wird automatisch Admin. */
export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	/** Ordnername für die Originalfotos, wird bei der Registrierung einmalig gesetzt. */
	folder: text('folder').notNull().unique(),
	role: text('role', { enum: ['user', 'admin'] })
		.notNull()
		.default('user'),
	disabled: boolean('disabled').notNull().default(false),
	themePref: text('theme_pref', { enum: ['dark', 'light'] })
		.notNull()
		.default('dark'),
	feedbackDefault: boolean('feedback_default').notNull().default(true),
	showGps: boolean('show_gps').notNull().default(true),
	emailNotifications: boolean('email_notifications').notNull().default(true),
	/** Gesetzt, sobald die Einführung abgeschlossen ist. */
	onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
	createdAt: createdAt()
});

/**
 * Einmalige Login-Links und -Codes. Bei einer Registrierung ist `userId` leer;
 * der User wird erst beim Bestätigen angelegt.
 */
export const loginTokens = pgTable('login_tokens', {
	id: serial('id').primaryKey(),
	email: text('email').notNull(),
	name: text('name'),
	userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
	invitationId: integer('invitation_id').references(() => invitations.id, {
		onDelete: 'set null'
	}),
	tokenHash: text('token_hash').notNull().unique(),
	codeHash: text('code_hash').notNull(),
	attempts: smallint('attempts').notNull().default(0),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	usedAt: timestamp('used_at', { withTimezone: true }),
	createdAt: createdAt()
});

export const sessions = pgTable('sessions', {
	/** SHA-256 des Session-Tokens im Cookie. */
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: createdAt()
});

export const invitations = pgTable('invitations', {
	id: serial('id').primaryKey(),
	tokenHash: text('token_hash').notNull().unique(),
	inviterId: integer('inviter_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	email: text('email'),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	acceptedBy: integer('accepted_by').references(() => users.id, { onDelete: 'set null' }),
	acceptedAt: timestamp('accepted_at', { withTimezone: true }),
	createdAt: createdAt()
});

export const themes = pgTable('themes', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	description: text('description').notNull().default(''),
	startDate: date('start_date').notNull(),
	/** Leer = wiederkehrendes Thema ohne festes Ende. */
	endDate: date('end_date'),
	/** Wochentag der Wochenbewertung, ISO: 1 = Montag … 7 = Sonntag. Leer = keine. */
	weeklyVoteDay: smallint('weekly_vote_day'),
	/** Automatische Feedback-Runden: Wochentag (ISO), Startzeit «HH:MM», Dauer in Stunden. */
	feedbackDay: smallint('feedback_day'),
	feedbackTime: text('feedback_time'),
	feedbackHours: smallint('feedback_hours').notNull().default(24),
	createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
	/** Gesetzt, wenn das Thema von Hand beendet wurde. */
	endedAt: timestamp('ended_at', { withTimezone: true }),
	createdAt: createdAt()
});

export const themeMembers = pgTable(
	'theme_members',
	{
		id: serial('id').primaryKey(),
		themeId: integer('theme_id')
			.notNull()
			.references(() => themes.id, { onDelete: 'cascade' }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		feedbackAlways: boolean('feedback_always').notNull().default(false),
		joinedAt: createdAt(),
		leftAt: timestamp('left_at', { withTimezone: true })
	},
	(t) => [
		// Pro Thema höchstens eine aktive Mitgliedschaft je User.
		uniqueIndex('theme_members_active')
			.on(t.themeId, t.userId)
			.where(sql`${t.leftAt} is null`)
	]
);

export const photos = pgTable(
	'photos',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		themeId: integer('theme_id')
			.notNull()
			.references(() => themes.id, { onDelete: 'cascade' }),
		/** Wettbewerbstag (Datum in Europe/Zurich). */
		day: date('day').notNull(),
		originalPath: text('original_path').notNull(),
		width: integer('width').notNull(),
		height: integer('height').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		exif: jsonb('exif').$type<PhotoExif>().notNull().default({}),
		feedbackWanted: boolean('feedback_wanted').notNull().default(true),
		createdAt: createdAt()
	},
	(t) => [unique('photos_one_per_day').on(t.userId, t.themeId, t.day)]
);

/** Tagesbewertung: 1–5 Sterne, anonym. */
export const votes = pgTable(
	'votes',
	{
		photoId: integer('photo_id')
			.notNull()
			.references(() => photos.id, { onDelete: 'cascade' }),
		voterId: integer('voter_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		stars: smallint('stars').notNull(),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.photoId, t.voterId] })]
);

/** Wochenbewertung: jeder vergibt 3, 2 und 1 Punkt(e). */
export const weeklyVotes = pgTable(
	'weekly_votes',
	{
		themeId: integer('theme_id')
			.notNull()
			.references(() => themes.id, { onDelete: 'cascade' }),
		/** Datum des Wochenbewertungstags. */
		voteDay: date('vote_day').notNull(),
		voterId: integer('voter_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		photoId: integer('photo_id')
			.notNull()
			.references(() => photos.id, { onDelete: 'cascade' }),
		points: smallint('points').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.themeId, t.voteDay, t.voterId, t.points] }),
		unique('weekly_votes_one_per_photo').on(t.themeId, t.voteDay, t.voterId, t.photoId)
	]
);

export const feedbackRounds = pgTable(
	'feedback_rounds',
	{
		id: serial('id').primaryKey(),
		themeId: integer('theme_id')
			.notNull()
			.references(() => themes.id, { onDelete: 'cascade' }),
		startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
		endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
		createdAt: createdAt()
	},
	(t) => [unique('feedback_rounds_unique_start').on(t.themeId, t.startsAt)]
);

export const feedbackRoundMembers = pgTable(
	'feedback_round_members',
	{
		roundId: integer('round_id')
			.notNull()
			.references(() => feedbackRounds.id, { onDelete: 'cascade' }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		participating: boolean('participating').notNull()
	},
	(t) => [primaryKey({ columns: [t.roundId, t.userId] })]
);

/** Persönliches Feedback zu einem Foto; sichtbar für Fotograf und Verfasser. */
export const feedback = pgTable('feedback', {
	id: serial('id').primaryKey(),
	photoId: integer('photo_id')
		.notNull()
		.references(() => photos.id, { onDelete: 'cascade' }),
	authorId: integer('author_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	body: text('body').notNull(),
	createdAt: createdAt()
});

export const settings = pgTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

/** Merkt sich verschickte Benachrichtigungen, damit nichts doppelt gesendet wird. */
export const notificationsSent = pgTable('notifications_sent', {
	key: text('key').primaryKey(),
	sentAt: createdAt()
});

export type User = typeof users.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type Photo = typeof photos.$inferSelect;
