export const resolutions = pgTable("resolutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  service: text("service").notNull(),
  confirmedRootCause: text("confirmed_root_cause").notNull(),
  mitigation: text("mitigation").notNull(),
  detectionGap: text("detection_gap"),          // what would have caught it earlier
  reviewedBy: text("reviewed_by").notNull(),    // a human signed off
  retainedAt: timestamp("retained_at"),         // null until memory write succeeds
});