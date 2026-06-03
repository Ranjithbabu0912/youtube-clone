import express from "express";
import { login, updateprofile, updateWatchTime, verifyMobile, verifyOtp, getAllUsers } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-mobile", verifyMobile);
routes.post("/verify-otp", verifyOtp);
routes.patch("/update/:id", updateprofile);
routes.post("/update-watch-time", updateWatchTime);
routes.get("/all-users", getAllUsers);
export default routes;
