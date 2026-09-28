import { Router, type IRouter } from "express";
import {
  GetMemoryParams,
  GetMemoryResponse,
  ListMemoriesQueryParams,
  ListMemoriesResponse,
  RecallMemoryBody,
  RecallMemoryResponse,
} from "@workspace/api-zod";
import { memories } from "../services/state";
import { searchRelevantIncidents } from "../services/hindsight_service";

const router: IRouter = Router();
const pathValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

router.get("/memory", (req, res) => {
  const parsed = ListMemoriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, service, severity } = parsed.data;
  const needle = search?.toLowerCase();
  const result = memories
    .filter((memory) => !needle || [memory.id, memory.incidentTitle, memory.service, memory.rootCause, memory.lessonsLearned].join(" ").toLowerCase().includes(needle))
    .filter((memory) => !service || memory.service === service)
    .filter((memory) => !severity || memory.severity === severity)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json(ListMemoriesResponse.parse(result));
});

router.get("/memory/:memoryId", (req, res) => {
  const params = GetMemoryParams.safeParse({ memoryId: pathValue(req.params.memoryId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const memory = memories.find((candidate) => candidate.id === params.data.memoryId);
  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }
  res.json(GetMemoryResponse.parse(memory));
});

router.post("/memory/recall", async (req, res): Promise<void> => {
  const parsed = RecallMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await searchRelevantIncidents({
    service: parsed.data.service,
    errorMessage: parsed.data.errorMessage,
    logs: parsed.data.symptoms,
    metrics: [],
  });
  res.json(RecallMemoryResponse.parse({
    memories: result.memories,
    usedMemory: result.memories.length > 0,
    fallbackMode: result.fallbackMode,
    notice: result.notice ?? "Relevant historical experience recalled.",
  }));
});

export default router;
