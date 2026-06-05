import { Router, type IRouter } from "express";
import healthRouter from "./health";
import panelsRouter from "./panels";
import ticketsRouter from "./tickets";
import transcriptsRouter from "./transcripts";
import settingsRouter from "./settings";
import guildsRouter from "./guilds";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/panels", panelsRouter);
router.use("/tickets", ticketsRouter);
router.use("/transcripts", transcriptsRouter);
router.use("/settings", settingsRouter);
router.use("/guilds", guildsRouter);

export default router;
