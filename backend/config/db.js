import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri === "mmmm") {
    console.warn(
      "[db] MONGODB_URI is not set (still 'mmmm'). Replace it in backend/.env before running."
    );
  }
  try {
    await mongoose.connect(uri);
    console.log("[db] MongoDB connected");
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  }
}
