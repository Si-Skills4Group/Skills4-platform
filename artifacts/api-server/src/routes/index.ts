import { Router, type IRouter } from "express";
import healthRouter from "./health";
import organisationsRouter from "./organisations";
import contactsRouter from "./contacts";
import engagementsRouter from "./engagements";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/organisations", organisationsRouter);
router.use("/contacts", contactsRouter);
router.use("/engagements", engagementsRouter);
router.use("/tasks", tasksRouter);
router.use("/dashboard", dashboardRouter);

export default router;
