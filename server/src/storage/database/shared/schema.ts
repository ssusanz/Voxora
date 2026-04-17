import { pgTable, serial, timestamp, varchar, boolean, integer, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 家庭表
export const families = pgTable(
	"families",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 128 }).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [index("families_id_idx").on(table.id)]
);

// 用户表
export const users = pgTable(
	"users",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 128 }).notNull(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		family_id: varchar("family_id", { length: 36 }).references(() => families.id, { onDelete: "cascade" }),
		avatar: varchar("avatar", { length: 512 }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("users_id_idx").on(table.id),
		index("users_family_id_idx").on(table.family_id),
		index("users_email_idx").on(table.email),
	]
);

// 回忆表
export const memories = pgTable(
	"memories",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		title: varchar("title", { length: 256 }).notNull(),
		cover_image: varchar("cover_image", { length: 1024 }),
		date: varchar("date", { length: 64 }).notNull(),
		location: varchar("location", { length: 256 }),
		weather: varchar("weather", { length: 32 }),
		mood: varchar("mood", { length: 32 }),
		is_multi_user: boolean("is_multi_user").default(false).notNull(),
		user_count: integer("user_count").default(1).notNull(),
		images: jsonb("images"),
		user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
		family_id: varchar("family_id", { length: 36 }).references(() => families.id, { onDelete: "cascade" }),
		likes: integer("likes").default(0).notNull(),
		is_sealed: boolean("is_sealed").default(false).notNull(),
		unlock_date: timestamp("unlock_date", { withTimezone: true }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("memories_id_idx").on(table.id),
		index("memories_user_id_idx").on(table.user_id),
		index("memories_family_id_idx").on(table.family_id),
		index("memories_created_at_idx").on(table.created_at),
	]
);

// Vlog表
export const vlogs = pgTable(
	"vlogs",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		title: varchar("title", { length: 256 }).notNull(),
		video_url: varchar("video_url", { length: 1024 }),
		memory_ids: jsonb("memory_ids"),
		user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
		family_id: varchar("family_id", { length: 36 }).references(() => families.id, { onDelete: "cascade" }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("vlogs_id_idx").on(table.id),
		index("vlogs_user_id_idx").on(table.user_id),
		index("vlogs_family_id_idx").on(table.family_id),
		index("vlogs_created_at_idx").on(table.created_at),
	]
);
