import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organisationsRouter from "./organisations";
import contactsRouter from "./contacts";
import engagementsRouter from "./engagements";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import { authenticate } from "../middlewares/authenticate";

const router: IRouter = Router();

router.use(healthRouter);

router.use("/auth", authRouter);

router.use(authenticate);

router.use("/organisations", organisationsRouter);
router.use("/contacts", contactsRouter);
router.use("/engagements", engagementsRouter);
router.use("/tasks", tasksRouter);
router.use("/dashboard", dashboardRouter);
router.use("/users", usersRouter);

export default router;
