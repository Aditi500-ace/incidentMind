import {
  type Incident,
  type IncidentAnalysis,
  type Memory,
  type Runbook,
} from "./state";
import { searchRelevantIncidents, hindsightStatus } from "./hindsight_service";
import { logger } from "../lib/logger";

const genericAnalysis = (incident: Incident, memories: Memory[]): IncidentAnalysis => {
  const status = hindsightStatus();
  const hasMemory = memories.length > 0;
  const primaryMemory = memories[0];

  if (hasMemory && primaryMemory) {
    return {
      summary: `IncidentMind found a similar ${primaryMemory.service} incident from ${primaryMemory.incidentTitle}. The previous failure was traced to ${primaryMemory.rootCause}.`,
      rootCauses: [
        {
          title: primaryMemory.rootCause,
          detail: `The current signals overlap with the stored experience: ${primaryMemory.symptoms.slice(0, 2).join(" and ")}.`,
          confidence: "High",
        },
        {
          title: "Traffic or dependency saturation",
          detail: "Confirm whether the same capacity boundary is being reached again under current load.",
          confidence: "Medium",
        },
      ],
      investigationSteps: [
        `Check current ${primaryMemory.service.toLowerCase()} connection utilization first.`,
        "Compare traffic and error rates with the previous incident window.",
        "Inspect database timeout or dependency saturation errors.",
        "Verify the current pool and timeout configuration.",
      ],
      remediation: [
        `If saturation is confirmed, apply the previously successful remediation: ${primaryMemory.resolution}`,
        "Add or confirm a saturation alert before closing the incident.",
      ],
      confidence: "High · grounded in recalled experience",
      historicalMemories: memories,
      usedMemory: true,
      fallbackMode: status.fallbackMode,
      memoryNotice: status.notice,
      sources: ["Hindsight memory recall", "Incident runbook library", primaryMemory.incidentTitle],
    };
  }

  const likelyDatabase = incident.service.toLowerCase().includes("payment") || incident.errorMessage.toLowerCase().includes("database");
  return {
    summary: `New pattern detected — no closely matching historical incident found. IncidentMind will establish a baseline from the current ${incident.service} signals.`,
    rootCauses: [
      {
        title: likelyDatabase ? "Database or connection saturation" : "Dependency saturation",
        detail: "The error pattern and current metrics suggest validating downstream capacity before changing application code.",
        confidence: "Medium",
      },
      {
        title: "Recent deployment or configuration change",
        detail: "Rule out a recent change that could explain the onset and scope of the incident.",
        confidence: "Medium",
      },
    ],
    investigationSteps: [
      "Check database connectivity, CPU utilization, logs, and recent deployments.",
      "Compare current traffic and error rate to the last known healthy window.",
      "Trace the slowest request path across downstream dependencies.",
      "Confirm whether the symptom is isolated to one component or spreading.",
    ],
    remediation: [
      "Stabilize the affected service and protect dependent workloads.",
      "Capture the confirmed root cause and successful fix when resolved.",
    ],
    confidence: "Exploratory · no matching memory",
    historicalMemories: [],
    usedMemory: false,
    fallbackMode: status.fallbackMode,
    memoryNotice: status.notice,
    sources: ["Incident signals", "Incident runbook library"],
  };
};

export const analyzeIncident = async (
  incident: Incident,
  runbooks: Runbook[],
  options: { allowMemory?: boolean } = {},
) => {
  const { memories } = options.allowMemory === false
    ? { memories: [] as Memory[] }
    : await searchRelevantIncidents(incident);
  const fallback = genericAnalysis(incident, memories);
  const analysis = await tryOpenAiAnalysis(incident, memories, fallback);
  const relevantRunbook = runbooks.find((runbook) =>
    [runbook.service, runbook.title, ...runbook.symptoms].some((value) =>
      incident.service.toLowerCase().includes(value.toLowerCase()) ||
      incident.errorMessage.toLowerCase().includes(value.toLowerCase()),
    ),
  );
  if (relevantRunbook && analysis.sources) analysis.sources.push(relevantRunbook.title);
  return analysis;
};

async function tryOpenAiAnalysis(
  incident: Incident,
  memories: Memory[],
  fallback: IncidentAnalysis,
): Promise<IncidentAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are IncidentMind, an SRE incident response agent.",
              "Return only JSON with keys summary, rootCauses, investigationSteps, remediation, confidence.",
              "rootCauses must be an array of {title, detail, confidence}.",
              "Use the recalled memories materially when they exist. Never invent a historical incident.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              incident: {
                title: incident.title,
                service: incident.service,
                severity: incident.severity,
                errorMessage: incident.errorMessage,
                logs: incident.logs,
                metrics: incident.metrics,
              },
              recalledMemories: memories,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "OpenAI analysis request failed; using deterministic analysis");
      return fallback;
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = JSON.parse(content) as Partial<IncidentAnalysis>;
    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.rootCauses) ||
      !Array.isArray(parsed.investigationSteps) ||
      !Array.isArray(parsed.remediation) ||
      typeof parsed.confidence !== "string"
    ) {
      return fallback;
    }
    return {
      ...fallback,
      summary: parsed.summary,
      rootCauses: parsed.rootCauses as IncidentAnalysis["rootCauses"],
      investigationSteps: parsed.investigationSteps as string[],
      remediation: parsed.remediation as string[],
      confidence: parsed.confidence,
      sources: [...(fallback.sources ?? []), "OpenAI incident analysis"],
    };
  } catch (error) {
    logger.warn({ err: error }, "OpenAI analysis unavailable; using deterministic analysis");
    return fallback;
  }
}
