import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const entries = pgTable('entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  start: timestamp('start', { withTimezone: true }).notNull(),
  end: timestamp('end', { withTimezone: true }),
  task: text('task').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: text('date').notNull().unique(), // 'YYYY-MM-DD'
  attended: boolean('attended').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const offDays = pgTable('off_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: text('date').notNull().unique(), // 'YYYY-MM-DD'
  type: text('type').notNull(), // 'paid' | 'unpaid'
  reason: text('reason').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EntryRow = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

export type AttendanceRow = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type OffDayRow = typeof offDays.$inferSelect;
export type NewOffDay = typeof offDays.$inferInsert;

export type SettingRow = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

