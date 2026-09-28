import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { incidents, memories, postmortems, type Activity } from "../services/state";

const router: IRouter = Router();

router.get("/dashboard/summary", (_req, res) => {
  const resolved = incidents.filter((incident) => incident.status === "resolved");
  const resolutionMinutes = resolved.map((incident) => {
    if (!incident.resolvedAt) return 0;
    return Math.max(1, Math.round((incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 60_000));
  });
  const serviceCounts = new Map<string, number>();
  const patternCounts = new Map<string, number>();
  for (const incident of incidents) {
    serviceCounts.set(incident.service, (serviceCounts.get(incident.service) ?? 0) + 1);
    const pattern = incident.rootCause?.split(" ").slice(0, 3).join(" ") ?? "Unresolved pattern";
    patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
  }
  const activities: Activity[] = incidents
    .flatMap((incident) => {
      const latest = incident.events.at(-1);
      return latest
        ? [{
            id: latest.id,
            label: latest.label,
            detail: `${incident.id} · ${incident.service}`,
            timestamp: latest.timestamp,
            tone: incident.severity === "SEV-1" ? "critical" as const : "success" as const,
          }]
        : [];
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 6);

  const summary = {
    activeIncidents: incidents.filter((incident) => incident.status !== "resolved").length,
    resolvedIncidents: resolved.length,
    criticalIncidents: incidents.filter((incident) => incident.severity === "SEV-1").length,
    averageResolutionMinutes: resolutionMinutes.length
      ? Math.round(resolutionMinutes.reduce((sum, value) => sum + value, 0) / resolutionMinutes.length)
      : 0,
    memoryEntries: memories.length,
    repeatedIncidents: [...serviceCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0),
    servicesAffected: serviceCounts.size,
    incidentsOverTime: [
      { label: "14d", value: incidents.filter((incident) => incident.createdAt < new Date(Date.now() - 10 * 86400000)).length },
      { label: "7d", value: incidents.filter((incident) => incident.createdAt >= new Date(Date.now() - 10 * 86400000)).length },
      { label: "Today", value: incidents.filter((incident) => incident.createdAt >= new Date(Date.now() - 86400000)).length },
    ],
    incidentsBySeverity: ["SEV-1", "SEV-2", "SEV-3", "SEV-4"].map((severity) => ({
      label: severity,
      value: incidents.filter((incident) => incident.severity === severity).length,
    })),
    servicesByImpact: [...serviceCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    repeatedPatterns: [...patternCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    recentActivity: activities,
    postmortems: postmortems.length,
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
