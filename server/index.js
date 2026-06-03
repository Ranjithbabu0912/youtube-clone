import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import mongoose from "mongoose";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import { translateComment } from "./controllers/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
dotenv.config();
const app = express();
import path from "path";
app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/comments", commentroutes);
app.use("/comment", commentroutes);
app.post("/translate", translateComment);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);


const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    const server = createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    const usersMap = new Map(); // userId -> socketId

    io.on("connection", (socket) => {
      socket.on("register-user", (userId) => {
        usersMap.set(userId, socket.id);
        io.emit("online-users", Array.from(usersMap.keys()));
      });

      socket.on("call-user", ({ toCall, offer, callerName, callerId, callerImage }) => {
        const targetSocketId = usersMap.get(toCall);
        if (targetSocketId) {
          io.to(targetSocketId).emit("incoming-call", {
            from: socket.id,
            callerName,
            callerId,
            callerImage,
            offer
          });
        } else {
          socket.emit("call-failed", { reason: "User is offline" });
        }
      });

      socket.on("answer-call", ({ to, answer }) => {
        io.to(to).emit("call-accepted", { answer, from: socket.id });
      });

      socket.on("reject-call", ({ to }) => {
        io.to(to).emit("call-rejected");
      });

      socket.on("ice-candidate", ({ to, candidate }) => {
        io.to(to).emit("ice-candidate", { candidate });
      });

      socket.on("hangup", ({ to }) => {
        const targetSocketId = usersMap.get(to) || to;
        io.to(targetSocketId).emit("call-ended");
      });

      socket.on("sync-youtube", ({ to, action, videoId, time, isPlaying }) => {
        const targetSocketId = usersMap.get(to) || to;
        io.to(targetSocketId).emit("sync-youtube-client", { action, videoId, time, isPlaying });
      });

      socket.on("disconnect", () => {
        for (const [userId, socketId] of usersMap.entries()) {
          if (socketId === socket.id) {
            usersMap.delete(userId);
            break;
          }
        }
        io.emit("online-users", Array.from(usersMap.keys()));
      });
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB error:", err);
  });
