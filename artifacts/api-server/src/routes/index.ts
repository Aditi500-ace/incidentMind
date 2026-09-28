import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import incidentsRouter from "./incidents";
import memoryRouter from "./memory";
import runbooksRouter from "./runbooks";
import postmortemsRouter from "./postmortems";
import demoRouter from "./demo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(incidentsRouter);
router.use(memoryRouter);
router.use(runbooksRouter);
router.use(postmortemsRouter);
router.use(demoRouter);

export default router;
