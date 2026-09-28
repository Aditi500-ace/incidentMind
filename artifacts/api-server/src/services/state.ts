export type Severity = "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";
export type IncidentStatus = "active" | "investigating" | "resolved";
export type MemorySource = "hindsight" | "demo-fallback";

export interface Metric {
  label: string;
  value: string;
  numericValue?: number | null;
  unit?: string | null;
}

export interface IncidentEvent {
  id: string;
  type: string;
  label: string;
  detail?: string | null;
  timestamp: Date;
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  errorMessage: string;
  logs: string[];
  metrics: Metric[];
  timestamp: Date;
  affectedComponents?: string[];
  rootCause?: string | null;
  resolution?: string | null;
  lessonsLearned?: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
  events: IncidentEvent[];
  analysis?: IncidentAnalysis | null;
  memoryId?: string | null;
}

export interface Hypothesis {
  title: string;
  detail: string;
  confidence: string;
}

export interface Memory {
  id: string;
  incidentId: string;
  incidentTitle: string;
  service: string;
  severity: Severity;
  symptoms: string[];
  rootCause: string;
  resolution: string;
  lessonsLearned: string;
  investigationSteps?: string[];
  source: MemorySource;
  createdAt: Date;
}

export interface IncidentAnalysis {
  summary: string;
  rootCauses: Hypothesis[];
  investigationSteps: string[];
  remediation: string[];
  confidence: string;
  historicalMemories: Memory[];
  usedMemory: boolean;
  fallbackMode: boolean;
  memoryNotice?: string | null;
  sources?: string[];
}

export interface ResolutionInput {
  rootCause: string;
  resolutionSteps: string[];
  actionsTaken: string[];
  servicesAffected: string[];
  whatFixedIt: string;
  lessonsLearned: string;
}

export interface Runbook {
  id: string;
  title: string;
  service: string;
  symptoms: string[];
  checks: string[];
  commands: string[];
  possibleCauses: string[];
  remediation: string[];
  verification: string[];
}

export interface Postmortem {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  impact: string;
  timeline: IncidentEvent[];
  rootCause: string;
  contributingFactors: string[];
  resolution: string;
  preventiveActions: string[];
  lessonsLearned: string;
  createdAt: Date;
}

export type DemoStage = "ready" | "investigated" | "learned" | "recalled";

export interface DemoState {
  stage: DemoStage;
  firstIncident: Incident | null;
  similarIncident: Incident | null;
  memory: Memory | null;
  analysis: IncidentAnalysis | null;
  fallbackMode: boolean;
}

export interface Activity {
  id: string;
  label: string;
  detail: string;
  timestamp: Date;
  tone: "critical" | "warning" | "success" | "neutral";
}

const daysAgo = (days: number, hours = 0) =>
  new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000);

const event = (
  id: string,
  type: string,
  label: string,
  timestamp: Date,
  detail?: string,
): IncidentEvent => ({ id, type, label, timestamp, detail });

const makeHistoricalIncident = (
  input: Omit<Incident, "events" | "analysis" | "memoryId">,
  eventLabels: string[],
) => ({
  ...input,
  events: eventLabels.map((label, index) =>
    event(
      `${input.id}-EV-${index + 1}`,
      index === eventLabels.length - 1 ? "resolved" : "signal",
      label,
      new Date(input.createdAt.getTime() + index * 22 * 60 * 1000),
    ),
  ),
  analysis: null,
  memoryId: null,
});

export const incidents: Incident[] = [
  makeHistoricalIncident(
    {
      id: "INC-001",
      title: "Payment API latency spike",
      service: "Payment API",
      severity: "SEV-1",
      status: "resolved",
      errorMessage: "Payment API latency increased above 5 seconds",
      logs: [
        "Connection pool exhausted",
        "Database timeout",
        "503 responses increasing",
      ],
      metrics: [
        { label: "CPU", value: "72%", numericValue: 72, unit: "%" },
        { label: "Memory", value: "81%", numericValue: 81, unit: "%" },
        { label: "Error rate", value: "18%", numericValue: 18, unit: "%" },
        { label: "Latency", value: "5.8s", numericValue: 5.8, unit: "s" },
      ],
      timestamp: daysAgo(14),
      affectedComponents: ["payment-api", "postgres-primary", "checkout"],
      rootCause: "Database connection pool exhaustion caused by a sudden traffic spike.",
      resolution: "Increased connection pool size and restarted the affected service.",
      lessonsLearned:
        "Monitor connection pool utilization and configure alerts before saturation.",
      createdAt: daysAgo(14),
      updatedAt: daysAgo(13, 22),
      resolvedAt: daysAgo(13, 22),
    },
    ["Latency alert fired", "Database timeout confirmed", "Connection pool expanded"],
  ),
  makeHistoricalIncident(
    {
      id: "INC-002",
      title: "Checkout service 503 errors",
      service: "Checkout",
      severity: "SEV-2",
      status: "resolved",
      errorMessage: "Checkout returned elevated 503 responses",
      logs: ["upstream connect error", "Database timeout after 30s"],
      metrics: [
        { label: "CPU", value: "64%", numericValue: 64, unit: "%" },
        { label: "Error rate", value: "11%", numericValue: 11, unit: "%" },
        { label: "Latency", value: "2.9s", numericValue: 2.9, unit: "s" },
      ],
      timestamp: daysAgo(11),
      affectedComponents: ["checkout", "postgres-primary"],
      rootCause: "Database timeout caused by an undersized work memory configuration.",
      resolution: "Tuned database connection and work memory settings.",
      lessonsLearned: "Alert on database wait time before checkout error rates climb.",
      createdAt: daysAgo(11),
      updatedAt: daysAgo(10, 20),
      resolvedAt: daysAgo(10, 20),
    },
    ["503 alert fired", "Database wait time isolated", "Connection tuning deployed"],
  ),
  makeHistoricalIncident(
    {
      id: "INC-003",
      title: "Notification service failures",
      service: "Notifications",
      severity: "SEV-2",
      status: "resolved",
      errorMessage: "Notification delivery failures increased above 12%",
      logs: ["Redis client queue full", "ECONNRESET from redis-primary"],
      metrics: [
        { label: "Error rate", value: "13%", numericValue: 13, unit: "%" },
        { label: "Queue depth", value: "8.4k", numericValue: 8400, unit: "jobs" },
      ],
      timestamp: daysAgo(7),
      affectedComponents: ["notification-worker", "redis-primary"],
      rootCause: "Redis connection exhaustion during a notification backlog.",
      resolution: "Increased the Redis connection pool and drained the queue.",
      lessonsLearned: "Track Redis pool utilization alongside queue depth.",
      createdAt: daysAgo(7),
      updatedAt: daysAgo(6, 18),
      resolvedAt: daysAgo(6, 18),
    },
    ["Delivery failures alert fired", "Redis saturation confirmed", "Pool adjusted and queue drained"],
  ),
  makeHistoricalIncident(
    {
      id: "INC-004",
      title: "Kubernetes pod crash loop",
      service: "Orders Worker",
      severity: "SEV-3",
      status: "resolved",
      errorMessage: "orders-worker entered CrashLoopBackOff",
      logs: ["OOMKilled", "container memory limit exceeded"],
      metrics: [
        { label: "Memory", value: "99%", numericValue: 99, unit: "%" },
        { label: "Restart count", value: "16", numericValue: 16, unit: "restarts" },
      ],
      timestamp: daysAgo(4),
      affectedComponents: ["orders-worker", "kubernetes"],
      rootCause: "Worker memory limit was below the workload's peak usage.",
      resolution: "Adjusted the container memory limit and rolled out a new deployment.",
      lessonsLearned: "Set memory alerts before Kubernetes begins evicting workers.",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(3, 19),
      resolvedAt: daysAgo(3, 19),
    },
    ["CrashLoopBackOff detected", "OOM kill confirmed", "Memory limit increased"],
  ),
];

export const memories: Memory[] = [
  {
    id: "MEM-002",
    incidentId: "INC-002",
    incidentTitle: "Checkout service 503 errors",
    service: "Checkout",
    severity: "SEV-2",
    symptoms: ["Elevated 503s", "Database timeout after 30s", "Rising upstream latency"],
    rootCause: "Database timeout caused by an undersized work memory configuration.",
    resolution: "Tuned database connection and work memory settings.",
    lessonsLearned: "Alert on database wait time before checkout error rates climb.",
    investigationSteps: ["Compare database wait time", "Inspect connection saturation", "Review recent tuning changes"],
    source: "demo-fallback",
    createdAt: daysAgo(10, 20),
  },
  {
    id: "MEM-003",
    incidentId: "INC-003",
    incidentTitle: "Notification service failures",
    service: "Notifications",
    severity: "SEV-2",
    symptoms: ["Notification delivery failures", "Redis client queue full", "Growing job backlog"],
    rootCause: "Redis connection exhaustion during a notification backlog.",
    resolution: "Increased the Redis connection pool and drained the queue.",
    lessonsLearned: "Track Redis pool utilization alongside queue depth.",
    investigationSteps: ["Inspect Redis pool utilization", "Check queue depth", "Review worker concurrency"],
    source: "demo-fallback",
    createdAt: daysAgo(6, 18),
  },
  {
    id: "MEM-004",
    incidentId: "INC-004",
    incidentTitle: "Kubernetes pod crash loop",
    service: "Orders Worker",
    severity: "SEV-3",
    symptoms: ["CrashLoopBackOff", "OOMKilled", "Restart count increasing"],
    rootCause: "Worker memory limit was below the workload's peak usage.",
    resolution: "Adjusted the container memory limit and rolled out a new deployment.",
    lessonsLearned: "Set memory alerts before Kubernetes begins evicting workers.",
    investigationSteps: ["Inspect pod events", "Compare working set to limits", "Review deployment resources"],
    source: "demo-fallback",
    createdAt: daysAgo(3, 19),
  },
];

export const runbooks: Runbook[] = [
  {
    id: "RB-001",
    title: "Database Connection Pool Exhaustion",
    service: "Database",
    symptoms: ["Connection pool exhausted", "Timeouts from API workers", "503 responses"],
    checks: ["Inspect active connections", "Compare pool usage to configured max", "Check traffic rate"],
    commands: ["SELECT count(*) FROM pg_stat_activity;", "kubectl logs deploy/payment-api | grep timeout"],
    possibleCauses: ["Traffic spike", "Leaked connections", "Pool limit below worker concurrency"],
    remediation: ["Raise pool size within database limits", "Restart affected workers", "Add saturation alert"],
    verification: ["Pool utilization returns below 70%", "Timeouts stop", "p95 latency returns to baseline"],
  },
  {
    id: "RB-002",
    title: "High API Latency",
    service: "API",
    symptoms: ["p95 latency above SLO", "Request queue growth", "Slow downstream calls"],
    checks: ["Break latency down by route", "Check database wait time", "Inspect recent deploys"],
    commands: ["kubectl top pods -n production", "curl -s localhost:9090/metrics | grep http_request"],
    possibleCauses: ["Downstream saturation", "Bad query plan", "CPU throttling"],
    remediation: ["Roll back suspect deploy", "Tune slow query", "Scale the hot path"],
    verification: ["Latency is below SLO for 15 minutes", "No queue growth", "Error budget burn normalizes"],
  },
  {
    id: "RB-003",
    title: "Kubernetes Pod CrashLoopBackOff",
    service: "Kubernetes",
    symptoms: ["CrashLoopBackOff", "Restart count climbs", "OOMKilled events"],
    checks: ["Inspect pod events", "Compare working set to limits", "Review last image change"],
    commands: ["kubectl describe pod <pod>", "kubectl logs <pod> --previous"],
    possibleCauses: ["Memory limit exceeded", "Invalid config", "Dependency unavailable"],
    remediation: ["Adjust resources", "Fix configuration", "Restore dependency access"],
    verification: ["Pod stays ready", "Restart count is stable", "Readiness probes pass"],
  },
  {
    id: "RB-004",
    title: "Redis Connection Failure",
    service: "Redis",
    symptoms: ["ECONNRESET", "Queue depth increases", "Cache misses spike"],
    checks: ["Inspect connected clients", "Check pool utilization", "Review Redis health"],
    commands: ["redis-cli INFO clients", "redis-cli SLOWLOG GET 10"],
    possibleCauses: ["Connection pool exhaustion", "Redis failover", "Long-running commands"],
    remediation: ["Adjust pool size", "Drain queues safely", "Fail over or scale Redis"],
    verification: ["Queue depth trends down", "Clients reconnect", "Delivery rate recovers"],
  },
  {
    id: "RB-005",
    title: "High CPU Usage",
    service: "Compute",
    symptoms: ["CPU saturation", "Request latency rises", "Throttling"],
    checks: ["Find hottest pods", "Inspect request volume", "Profile recent code paths"],
    commands: ["kubectl top pods", "top -H -p <pid>"],
    possibleCauses: ["Traffic spike", "Hot loop", "Under-provisioned workload"],
    remediation: ["Scale replicas", "Roll back regression", "Tune resource requests"],
    verification: ["CPU below 75%", "Latency recovers", "No throttling events"],
  },
];

export const postmortems: Postmortem[] = incidents.map((incident, index) => ({
  id: `PM-${String(index + 1).padStart(3, "0")}`,
  incidentId: incident.id,
  title: `${incident.title} post-mortem`,
  summary: `${incident.title} affected ${incident.service} and was resolved after focused infrastructure remediation.`,
  impact:
    incident.severity === "SEV-1"
      ? "Payment requests exceeded the latency SLO and a portion returned 503 responses."
      : "A subset of requests or jobs experienced elevated errors while the service was remediated.",
  timeline: incident.events,
  rootCause: incident.rootCause ?? "Root cause documented during resolution.",
  contributingFactors: ["Alerting started after the customer-facing symptom", "Capacity limits were not visible in the primary dashboard"],
  resolution: incident.resolution ?? "Resolution documented during incident review.",
  preventiveActions: ["Add saturation alerting", "Document capacity thresholds", "Review the relevant runbook quarterly"],
  lessonsLearned: incident.lessonsLearned ?? "Capture operational signals before the next recurrence.",
  createdAt: incident.resolvedAt ?? incident.createdAt,
}));

export const demo: DemoState = {
  stage: "ready",
  firstIncident: null,
  similarIncident: null,
  memory: null,
  analysis: null,
  fallbackMode: true,
};

export const resetDemo = () => {
  for (const id of ["INC-DEMO-001", "INC-DEMO-002"]) {
    const index = incidents.findIndex((incident) => incident.id === id);
    if (index >= 0) incidents.splice(index, 1);
  }
  for (const id of ["MEM-DEMO-001", "PM-DEMO-001", "PM-DEMO-002"]) {
    const memoryIndex = memories.findIndex((memory) => memory.id === id);
    if (memoryIndex >= 0) memories.splice(memoryIndex, 1);
    const postmortemIndex = postmortems.findIndex((postmortem) => postmortem.id === id);
    if (postmortemIndex >= 0) postmortems.splice(postmortemIndex, 1);
  }
  demo.stage = "ready";
  demo.firstIncident = null;
  demo.similarIncident = null;
  demo.memory = null;
  demo.analysis = null;
  demo.fallbackMode = true;
};
