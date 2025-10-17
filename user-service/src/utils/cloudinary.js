const cloudinary = require("cloudinary").v2;
const path = require("path");

cloudinary.config(); // Tự đọc CLOUDINARY_URL từ .env

const uploadToCloudinary = async (buffer, fileName, folder = "users") => {
  const ext = path.extname(fileName || "").toLowerCase();
  const imageTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const videoTypes = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

  let resourceType = "";
  if (imageTypes.includes(ext)) resourceType = "image";
  else if (videoTypes.includes(ext)) resourceType = "video";
  else
    throw new Error(
      `Invalid file type (${ext}). Only image and video allowed.`
    );

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

module.exports = { uploadToCloudinary };
