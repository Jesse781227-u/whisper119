import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storefrontRouter from "./storefront";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import storageRouter from "./storage";
import analyticsRouter from "./analytics";
import exchangeRouter from "./exchange";
import newsletterRouter from "./newsletter";
import newsletterAdminRouter from "./newsletter-admin";
import newsletterWebhookRouter from "./newsletter-webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storefrontRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(analyticsRouter);
router.use(exchangeRouter);
router.use(newsletterRouter);
router.use(newsletterAdminRouter);
router.use(newsletterWebhookRouter);

export default router;
