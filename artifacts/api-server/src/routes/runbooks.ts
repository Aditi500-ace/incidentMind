import { Router, type IRouter } from "express";
import { GetRunbookParams, GetRunbookResponse, ListRunbooksResponse } from "@workspace/api-zod";
import { runbooks } from "../services/state";

const router: IRouter = Router();
const pathValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

router.get("/runbooks", (_req, res) => {
  res.json(ListRunbooksResponse.parse(runbooks));
});

router.get("/runbooks/:runbookId", (req, res) => {
  const parsed = GetRunbookParams.safeParse({ runbookId: pathValue(req.params.runbookId) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const runbook = runbooks.find((candidate) => candidate.id === parsed.data.runbookId);
  if (!runbook) {
    res.status(404).json({ error: "Runbook not found" });
    return;
  }
  res.json(GetRunbookResponse.parse(runbook));
});

export default router;
