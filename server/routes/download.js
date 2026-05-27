import express from "express";
import { addDownload, getDownloads, removeDownload } from "../controllers/download.js";

const routes = express.Router();

routes.post("/", addDownload);
routes.get("/user/:userId", getDownloads);
routes.delete("/:id", removeDownload);

export default routes;
