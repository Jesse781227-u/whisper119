import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storefrontRouter from "./storefront";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import storageRouter from "./storage";
import newsletterRouter from "./newsletter";
import analyticsRouter from "./analytics";
import exchangeRouter from "./exchange";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storefrontRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(newsletterRouter);
router.use(analyticsRouter);
router.use(exchangeRouter);

export default router;
