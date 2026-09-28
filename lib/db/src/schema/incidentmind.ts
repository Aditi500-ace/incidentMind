import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const json = jsonb("data").$type<Record<string, unknown>>().notNull();

export const incidentsTable = pgTable("incidentmind_incidents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  service: text("service").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  data: json,
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incidentEventsTable = pgTable("incidentmind_incident_events", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  type: text("type").notNull(),
  label: text("label").notNull(),
  data: json,
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incidentResolutionsTable = pgTable("incidentmind_incident_resolutions", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  rootCause: text("root_cause").notNull(),
  resolution: text("resolution").notNull(),
  lessonsLearned: text("lessons_learned").notNull(),
  data: json,
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const runbooksTable = pgTable("incidentmind_runbooks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  service: text("service").notNull(),
  data: json,
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postmortemsTable = pgTable("incidentmind_postmortems", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  title: text("title").notNull(),
  data: json,
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const demoSessionsTable = pgTable("incidentmind_demo_sessions", {
  id: text("id").primaryKey(),
  stage: text("stage").notNull(),
  data: json,
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ createdAt: true, updatedAt: true });
export const insertIncidentEventSchema = createInsertSchema(incidentEventsTable).omit({ createdAt: true });
export const insertIncidentResolutionSchema = createInsertSchema(incidentResolutionsTable).omit({ createdAt: true });
export const insertRunbookSchema = createInsertSchema(runbooksTable).omit({ createdAt: true });
export const insertPostmortemSchema = createInsertSchema(postmortemsTable).omit({ createdAt: true });
export const insertDemoSessionSchema = createInsertSchema(demoSessionsTable).omit({ createdAt: true, updatedAt: true });

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type IncidentRow = typeof incidentsTable.$inferSelect;
export type InsertIncidentEvent = z.infer<typeof insertIncidentEventSchema>;
export type InsertIncidentResolution = z.infer<typeof insertIncidentResolutionSchema>;
export type InsertRunbook = z.infer<typeof insertRunbookSchema>;
export type InsertPostmortem = z.infer<typeof insertPostmortemSchema>;
export type InsertDemoSession = z.infer<typeof insertDemoSessionSchema>;