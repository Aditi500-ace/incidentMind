import { memories, type Incident, type Memory, type ResolutionInput } from "./state";

const hasHindsightConfig = () =>
  Boolean(process.env.HINDSIGHT_URL && process.env.HINDSIGHT_API_KEY);

const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const hindsightStatus = () => ({
  configured: hasHindsightConfig(),
  fallbackMode: !hasHindsightConfig(),
  notice: hasHindsightConfig()
    ? null
    : "Demo fallback mode — Hindsight connection unavailable",
});

export const searchRelevantIncidents = async (
  incident: Pick<Incident, "service" | "errorMessage" | "logs" | "metrics">,
) => {
  const query = normalized(
    [incident.service, incident.errorMessage, ...incident.logs, ...incident.metrics.map((metric) => metric.label)]
      .join(" "),
  );
  const terms = new Set(query.split(" ").filter((term) => term.length > 3));

  const ranked = memories
    .map((memory) => {
      const text = normalized(
        [memory.service, memory.incidentTitle, ...memory.symptoms, memory.rootCause, memory.lessonsLearned].join(" "),
      );
      const overlap = [...terms].filter((term) => text.includes(term)).length;
      const serviceMatch = normalized(memory.service) === normalized(incident.service);
      return { memory, score: overlap + (serviceMatch ? 8 : 0) };
    })
    .filter(({ score }) => score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ memory }) => memory);

  return { memories: ranked, ...hindsightStatus() };
};

export const retainMemory = (incident: Incident, resolution: ResolutionInput): Memory => {
  const memory: Memory = {
    id: incident.id === "INC-DEMO-001" ? "MEM-DEMO-001" : `MEM-${incident.id.replace("INC-", "")}`,
    incidentId: incident.id,
    incidentTitle: incident.title,
    service: incident.service,
    severity: incident.severity,
    symptoms: [incident.errorMessage, ...incident.logs.slice(0, 3)],
    rootCause: resolution.rootCause,
    resolution: resolution.whatFixedIt,
    lessonsLearned: resolution.lessonsLearned,
    investigationSteps: resolution.actionsTaken,
    source: hasHindsightConfig() ? "hindsight" : "demo-fallback",
    createdAt: new Date(),
  };

  const existingIndex = memories.findIndex((candidate) => candidate.id === memory.id);
  if (existingIndex >= 0) memories[existingIndex] = memory;
  else memories.unshift(memory);

  return memory;
};

export const getIncidentMemory = (incidentId: string) =>
  memories.find((memory) => memory.incidentId === incidentId) ?? null;
