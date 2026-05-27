import express from "express";
import { createOrder, verifyPayment, mockUpgrade } from "../controllers/payment.js";

const routes = express.Router();

routes.post("/order", createOrder);
routes.post("/verify", verifyPayment);
routes.post("/mock-upgrade", mockUpgrade);

export default routes;
