import { Router, type IRouter } from "express";
import {
  GetDemoStateResponse,
  ResetDemoResponse,
  ResolveAndLearnDemoIncidentResponse,
  TriggerFirstDemoIncidentResponse,
  TriggerSimilarDemoIncidentResponse,
} from "@workspace/api-zod";
import { analyzeIncident } from "../services/agent_service";
import { retainMemory } from "../services/hindsight_service";
import { demo, incidents, postmortems, resetDemo, type Incident } from "../services/state";
import { runbooks } from "../services/state";

const router: IRouter = Router();

const demoIncident = (id: string, title: string): Incident => {
  const now = new Date();
  return {
    id,
    title,
    service: "Payment API",
    severity: "SEV-1",
    status: "active",
    errorMessage: "Payment API latency increased above 5 seconds",
    logs: ["Connection pool exhausted", "Database timeout", "503 responses increasing"],
    metrics: [
      { label: "CPU", value: "72%", numericValue: 72, unit: "%" },
      { label: "Memory", value: "81%", numericValue: 81, unit: "%" },
      { label: "Error rate", value: "18%", numericValue: 18, unit: "%" },
      { label: "Latency", value: "5.8s", numericValue: 5.8, unit: "s" },
    ],
    timestamp: now,
    affectedComponents: ["payment-api", "postgres-primary", "checkout"],
    rootCause: null,
    resolution: null,
    lessonsLearned: null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    events: [{
      id: `${id}-EV-1`,
      type: "created",
      label: "Payment API alert fired",
      detail: "Latency crossed the 5 second threshold",
      timestamp: now,
    }],
    analysis: null,
    memoryId: null,
  };
};

router.get("/demo/state", (_req, res) => {
  res.json(GetDemoStateResponse.parse(demo));
});

router.post("/demo/reset", (_req, res) => {
  resetDemo();
  res.json(ResetDemoResponse.parse(demo));
});

router.post("/demo/trigger-first", async (_req, res): Promise<void> => {
  resetDemo();
  const incident = demoIncident("INC-DEMO-001", "Payment API latency spike · first occurrence");
  incidents.unshift(incident);
  const analysis = await analyzeIncident(incident, runbooks, { allowMemory: false });
  incident.status = "investigating";
  incident.analysis = analysis;
  incident.events.push({
    id: `${incident.id}-EV-2`,
    type: "analysis",
    label: "General investigation plan generated",
    detail: analysis.summary,
    timestamp: new Date(),
  });
  demo.stage = "investigated";
  demo.firstIncident = incident;
  demo.analysis = analysis;
  demo.memory = null;
  demo.similarIncident = null;
  demo.fallbackMode = analysis.fallbackMode;
  res.json(TriggerFirstDemoIncidentResponse.parse({
    state: demo,
    message: "No relevant historical memory found. IncidentMind generated a general investigation plan.",
  }));
});

router.post("/demo/resolve-and-learn", (_req, res): void => {
  const incident = demo.firstIncident;
  if (!incident) {
    res.status(400).json({ error: "Trigger the first demo incident before teaching IncidentMind" });
    return;
  }
  const resolution = {
    rootCause: "Database connection pool exhaustion caused by a sudden traffic spike.",
    resolutionSteps: ["Increased connection pool size", "Restarted the affected payment service"],
    actionsTaken: ["Checked pool utilization", "Compared traffic with baseline", "Raised the pool limit"],
    servicesAffected: ["payment-api", "postgres-primary", "checkout"],
    whatFixedIt: "Increased connection pool size and restarted the affected service.",
    lessonsLearned: "Monitor connection pool utilization and configure alerts before saturation.",
  };
  incident.status = "resolved";
  incident.rootCause = resolution.rootCause;
  incident.resolution = resolution.whatFixedIt;
  incident.lessonsLearned = resolution.lessonsLearned;
  incident.resolvedAt = new Date();
  incident.updatedAt = new Date();
  const memory = retainMemory(incident, resolution);
  incident.memoryId = memory.id;
  postmortems.unshift({
    id: "PM-DEMO-001",
    incidentId: incident.id,
    title: "Payment API latency spike post-mortem",
    summary: "The Payment API exceeded its latency SLO during a traffic spike.",
    impact: "Payment requests exceeded the latency SLO and some returned 503 responses.",
    timeline: incident.events,
    rootCause: resolution.rootCause,
    contributingFactors: ["Pool saturation was not visible in the primary service dashboard"],
    resolution: resolution.whatFixedIt,
    preventiveActions: ["Alert on pool utilization", "Review payment capacity before traffic events"],
    lessonsLearned: resolution.lessonsLearned,
    createdAt: new Date(),
  });
  demo.stage = "learned";
  demo.memory = memory;
  demo.analysis = incident.analysis ?? null;
  demo.fallbackMode = memory.source === "demo-fallback";
  res.json(ResolveAndLearnDemoIncidentResponse.parse({
    state: demo,
    message: memory.source === "hindsight"
      ? "Incident experience stored in Hindsight."
      : "Resolution stored locally. Demo fallback mode — Hindsight connection unavailable.",
  }));
});

router.post("/demo/trigger-similar", async (_req, res): Promise<void> => {
  if (!demo.memory) {
    res.status(400).json({ error: "Resolve and teach IncidentMind before triggering a similar incident" });
    return;
  }
  const incident = demoIncident("INC-DEMO-002", "Payment API latency spike · recurrence");
  incidents.unshift(incident);
  const analysis = await analyzeIncident(incident, runbooks);
  incident.status = "investigating";
  incident.analysis = analysis;
  incident.events.push({
    id: `${incident.id}-EV-2`,
    type: "analysis",
    label: "Relevant historical incident recalled",
    detail: analysis.summary,
    timestamp: new Date(),
  });
  demo.stage = "recalled";
  demo.similarIncident = incident;
  demo.analysis = analysis;
  demo.fallbackMode = analysis.fallbackMode;
  res.json(TriggerSimilarDemoIncidentResponse.parse({
    state: demo,
    message: analysis.usedMemory
      ? "Relevant historical incident recalled. IncidentMind upgraded the recommendation with the previous successful fix."
      : "No matching memory was recalled.",
  }));
});

export default router;
