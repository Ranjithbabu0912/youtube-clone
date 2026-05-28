import express from "express";
import { login, updateprofile, updateWatchTime } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.post("/update-watch-time", updateWatchTime);
export default routes;
