import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  // Allow build/test to succeed without Cloudinary configured, but runtime upload will fail clearly.
  console.warn("CLOUDINARY_CLOUD_NAME is not configured (proof uploads will fail).");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
