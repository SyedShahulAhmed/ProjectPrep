import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { ENV } from "./config/envConfig.js"; // ✅ load env from config file
import postRoutes from "./routes/postRoutes.js";

const app = express();
// ✅ Allow requests from anywhere (or specify your frontend domain)
app.use(cors({
  origin: "*",  // Or e.g. "https://yourfrontend.vercel.app"
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());

app.use("/api/posts", postRoutes);

mongoose
  .connect(ENV.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.listen(ENV.PORT, () =>
  console.log(`🚀 Server running on port ${ENV.PORT}`)
);
