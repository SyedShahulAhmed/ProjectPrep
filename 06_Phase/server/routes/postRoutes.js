import express from "express";
import multer from "multer";
import streamifier from "streamifier";
import { v2 as cloudinary } from "cloudinary";
import { ENV } from "../config/envConfig.js"; // ✅ Import shared env config
import Post from "../models/Post.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Configure Cloudinary using ENV object
cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const uploadFromBuffer = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "community_feed" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const result = await uploadFromBuffer(req.file.buffer);
    const post = await Post.create({
      name: req.body.name,
      imageUrl: result.secure_url,
    });

    res.json(post);
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
