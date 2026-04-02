import { pgTable, serial, timestamp, varchar, jsonb, text, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const memories = pgTable(
  "memories",
  {
    id: serial().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    memory_date: timestamp("memory_date", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 255 }),
    weather: varchar("weather", { length: 50 }),
    mood: varchar("mood", { length: 50 }),
    media_keys: jsonb("media_keys").$type<string[]>(),
    audio_key: text("audio_key"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("memories_memory_date_idx").on(table.memory_date),
    index("memories_created_at_idx").on(table.created_at),
  ]
);
