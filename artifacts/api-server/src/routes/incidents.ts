import { Router, type IRouter } from "express";
import {
  AnalyzeIncidentParams,
  AnalyzeIncidentResponse,
  CreateIncidentBody,
  CreateIncidentResponse,
  GetIncidentParams,
  GetIncidentResponse,
  ListIncidentsQueryParams,
  ListIncidentsResponse,
  ResolveIncidentBody,
  ResolveIncidentParams,
  ResolveIncidentResponse,
  RetainIncidentMemoryParams,
  RetainIncidentMemoryResponse,
} from "@workspace/api-zod";
import { incidents, postmortems, type Incident, type ResolutionInput } from "../services/state";
import { analyzeIncident } from "../services/agent_service";
import { getIncidentMemory, retainMemory } from "../services/hindsight_service";
import { runbooks } from "../services/state";

const router: IRouter = Router();
const pathValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const findIncident = (id: string) => incidents.find((incident) => incident.id === id);

router.get("/incidents", (req, res) => {
  const parsed = ListIncidentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, service, severity, status } = parsed.data;
  const needle = search?.toLowerCase();
  const result = incidents
    .filter((incident) => !needle || [incident.id, incident.title, incident.service, incident.errorMessage].join(" ").toLowerCase().includes(needle))
    .filter((incident) => !service || incident.service === service)
    .filter((incident) => !severity || incident.severity === severity)
    .filter((incident) => !status || incident.status === status)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json(ListIncidentsResponse.parse(result));
});

router.post("/incidents", (req, res) => {
  const parsed = CreateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const now = new Date();
  const incident: Incident = {
    id: `INC-${String(incidents.length + 1).padStart(3, "0")}`,
    ...parsed.data,
    status: "active",
    affectedComponents: parsed.data.affectedComponents ?? [],
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    rootCause: null,
    resolution: null,
    lessonsLearned: null,
    events: [ {
      id: `INC-${String(incidents.length + 1).padStart(3, "0")}-EV-1`,
      type: "created",
      label: "Incident created",
      detail: "Awaiting investigation",
      timestamp: now,
    } ],
    analysis: null,
    memoryId: null,
  };
  incidents.unshift(incident);
  res.status(201).json(CreateIncidentResponse.parse(incident));
});

router.get("/incidents/:incidentId", (req, res) => {
  const params = GetIncidentParams.safeParse({ incidentId: pathValue(req.params.incidentId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const incident = findIncident(params.data.incidentId);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const payload = { ...incident, memoryId: incident.memoryId ?? getIncidentMemory(incident.id)?.id ?? null };
  const parsed = GetIncidentResponse.safeParse(payload);
  res.json(parsed.success ? parsed.data : payload);
});

router.post("/incidents/:incidentId/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeIncidentParams.safeParse({ incidentId: pathValue(req.params.incidentId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const incident = findIncident(params.data.incidentId);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const analysis = await analyzeIncident(incident, runbooks);
  incident.status = "investigating";
  incident.updatedAt = new Date();
  incident.analysis = analysis;
  incident.events.push({
    id: `${incident.id}-EV-${incident.events.length + 1}`,
    type: "analysis",
    label: analysis.usedMemory ? "Relevant historical experience recalled" : "New pattern detected",
    detail: analysis.summary,
    timestamp: new Date(),
  });
  res.json(AnalyzeIncidentResponse.parse(analysis));
});

router.post("/incidents/:incidentId/resolve", (req, res) => {
  const params = ResolveIncidentParams.safeParse({ incidentId: pathValue(req.params.incidentId) });
  const body = ResolveIncidentBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const incident = findIncident(params.data.incidentId);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const resolution: ResolutionInput = body.data;
  incident.status = "resolved";
  incident.rootCause = resolution.rootCause;
  incident.resolution = resolution.whatFixedIt;
  incident.lessonsLearned = resolution.lessonsLearned;
  incident.updatedAt = new Date();
  incident.resolvedAt = new Date();
  incident.events.push({
    id: `${incident.id}-EV-${incident.events.length + 1}`,
    type: "resolved",
    label: "Incident resolved and learning captured",
    detail: resolution.whatFixedIt,
    timestamp: new Date(),
  });
  const memory = retainMemory(incident, resolution);
  incident.memoryId = memory.id;
  const postmortem = {
    id: incident.id === "INC-DEMO-001" ? "PM-DEMO-001" : `PM-${incident.id.replace("INC-", "")}`,
    incidentId: incident.id,
    title: `${incident.title} post-mortem`,
    summary: `${incident.title} was resolved after a focused investigation of the ${incident.service} failure.`,
    impact: incident.severity === "SEV-1" ? "Customer payment requests exceeded the latency SLO." : "A subset of requests or jobs experienced elevated errors.",
    timeline: incident.events,
    rootCause: resolution.rootCause,
    contributingFactors: ["The saturation signal was not prominent in the primary dashboard", "Alerting began after customer impact"],
    resolution: resolution.whatFixedIt,
    preventiveActions: ["Add saturation alerting", "Document capacity thresholds", "Review the runbook quarterly"],
    lessonsLearned: resolution.lessonsLearned,
    createdAt: new Date(),
  };
  const existingPostmortem = postmortems.findIndex((item) => item.id === postmortem.id);
  if (existingPostmortem >= 0) postmortems[existingPostmortem] = postmortem;
  else postmortems.unshift(postmortem);
  const result = { incident, memory, postmortem };
  res.json(ResolveIncidentResponse.parse(result));
});

router.post("/incidents/:incidentId/retain", (req, res) => {
  const params = RetainIncidentMemoryParams.safeParse({ incidentId: pathValue(req.params.incidentId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const incident = findIncident(params.data.incidentId);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  if (!incident.rootCause || !incident.resolution || !incident.lessonsLearned) {
    res.status(400).json({ error: "Resolve the incident before retaining a memory" });
    return;
  }
  const memory = retainMemory(incident, {
    rootCause: incident.rootCause,
    resolutionSteps: [incident.resolution],
    actionsTaken: [incident.resolution],
    servicesAffected: incident.affectedComponents ?? [],
    whatFixedIt: incident.resolution,
    lessonsLearned: incident.lessonsLearned,
  });
  incident.memoryId = memory.id;
  res.json(RetainIncidentMemoryResponse.parse(memory));
});

export default router;
