import express from "express";
import { login, updateprofile, updateWatchTime, verifyMobile, verifyOtp } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-mobile", verifyMobile);
routes.post("/verify-otp", verifyOtp);
routes.patch("/update/:id", updateprofile);
routes.post("/update-watch-time", updateWatchTime);
export default routes;
