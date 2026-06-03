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

    const publicVideoDir = path.join(process.cwd(), "..", "yourtube", "public", "video");
    if (!fs.existsSync(publicVideoDir)) {
      console.error("Public video directory not found at: " + publicVideoDir);
      process.exit(1);
    }

    const samples = [
      {
        title: "Beautiful Planet Earth",
        filename: "earth.mp4",
        sourceFilename: "earth.mp4",
        channel: "Earth Discoveries",
        uploader: "NatureLover"
      },
      {
        title: "Epic Gaming Highlights",
        filename: "gaming.mp4",
        sourceFilename: "gaming.mp4",
        channel: "Alpha Gaming",
        uploader: "GamerPro"
      },
      {
        title: "Stunning Nature Timelapse",
        filename: "nature.mp4",
        sourceFilename: "nature.mp4",
        channel: "Green World",
        uploader: "ForestWalker"
      },
      {
        title: "Sample Cinematic Video",
        filename: "vdo.mp4",
        sourceFilename: "vdo.mp4",
        channel: "YourTube Studios",
        uploader: "CreatorOne"
      },
      {
        title: "Modern Web Design Tutorial",
        filename: "web_design.mp4",
        sourceFilename: "web_design.mp4",
        channel: "Tech Crafts",
        uploader: "CodeNinja"
      }
    ];

    for (const sample of samples) {
      const srcPath = path.join(publicVideoDir, sample.sourceFilename);
      const destPath = path.join(uploadsDir, sample.filename);

      if (!fs.existsSync(srcPath)) {
        console.warn(`Source file not found: ${srcPath}, skipping...`);
        continue;
      }

      // Copy file locally
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied local video to ${destPath}`);

      const stats = fs.statSync(destPath);
      const size = stats.size.toString();

      // Check if video already exists in DB to prevent duplicate seeds
      const existing = await videofiles.findOne({ filename: sample.filename });
      if (existing) {
        console.log(`Video metadata already in DB for: ${sample.title}, skipping insert...`);
        continue;
      }

      // Insert record
      const video = new videofiles({
        videotitle: sample.title,
        filename: sample.filename,
        filepath: `uploads/${sample.filename}`,
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
