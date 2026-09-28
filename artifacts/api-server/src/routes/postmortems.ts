import { Router, type IRouter } from "express";
import {
  CreatePostmortemBody,
  CreatePostmortemResponse,
  GetPostmortemParams,
  GetPostmortemResponse,
  ListPostmortemsResponse,
} from "@workspace/api-zod";
import { postmortems } from "../services/state";

const router: IRouter = Router();
const pathValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

router.get("/postmortems", (_req, res) => {
  res.json(ListPostmortemsResponse.parse(postmortems));
});

router.post("/postmortems", (req, res) => {
  const parsed = CreatePostmortemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const postmortem = { ...parsed.data, id: `PM-${String(postmortems.length + 1).padStart(3, "0")}`, createdAt: new Date() };
  postmortems.unshift(postmortem);
  res.status(201).json(CreatePostmortemResponse.parse(postmortem));
});

router.get("/postmortems/:postmortemId", (req, res) => {
  const parsed = GetPostmortemParams.safeParse({ postmortemId: pathValue(req.params.postmortemId) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const postmortem = postmortems.find((candidate) => candidate.id === parsed.data.postmortemId);
  if (!postmortem) {
    res.status(404).json({ error: "Post-mortem not found" });
    return;
  }
  res.json(GetPostmortemResponse.parse(postmortem));
});

export default router;
