import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  likecomment,
  dislikecomment,
  translateComment
} from "../controllers/comment.js";

const routes = express.Router();

// Comments CRUD routes
routes.get("/:videoid", getallcomment);
routes.post("/", postcomment);
routes.patch("/:id/like", likecomment);
routes.patch("/:id/dislike", dislikecomment);
routes.post("/translate", translateComment);

// Legacy routes for backwards compatibility
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);

export default routes;
