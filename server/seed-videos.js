import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import videofiles from "./Modals/video.js";

dotenv.config();

const seed = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }

    const sourceFile = path.join(uploadsDir, "2025-06-25T06-09-29.296Z-vdo.mp4");
    if (!fs.existsSync(sourceFile)) {
      console.error("Source video file not found at: " + sourceFile);
      process.exit(1);
    }

    const samples = [
      {
        title: "Stunning Nature Timelapse",
        filename: "sample-nature.mp4",
        targetPath: "uploads/sample-nature.mp4",
        channel: "Earth Discoveries",
        uploader: "NatureLover"
      },
      {
        title: "Modern Web Design Tutorial",
        filename: "sample-coding.mp4",
        targetPath: "uploads/sample-coding.mp4",
        channel: "Tech Crafts",
        uploader: "CodeNinja"
      },
      {
        title: "Epic Gaming Highlights",
        filename: "sample-gaming.mp4",
        targetPath: "uploads/sample-gaming.mp4",
        channel: "Alpha Gaming",
        uploader: "GamerPro"
      }
    ];

    const stats = fs.statSync(sourceFile);
    const size = stats.size.toString();

    for (const sample of samples) {
      const destPath = path.join(process.cwd(), sample.targetPath);
      // Copy file locally
      fs.copyFileSync(sourceFile, destPath);
      console.log(`Copied local video to ${destPath}`);

      // Insert record
      const video = new videofiles({
        videotitle: sample.title,
        filename: sample.filename,
        filepath: sample.targetPath,
        filetype: "video/mp4",
        filesize: size,
        videochanel: sample.channel,
        uploader: sample.uploader
      });
      await video.save();
      console.log(`Saved video metadata to DB: ${sample.title}`);
    }

    console.log("Seeding complete successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seed();
