import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ✅ Resolve current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load .env file from the project root (same folder as server.js)
dotenv.config({ path: path.join(__dirname, "../.env") });

// ✅ Export environment variables as a clean object
export const ENV = {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

