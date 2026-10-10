import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const entries = pgTable('entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  start: timestamp('start', { withTimezone: true }).notNull(),
  end: timestamp('end', { withTimezone: true }),
  task: text('task').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EntryRow = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
