const { uploadToCloudinary, uploadToCloudinaryFromUrl } = require("./cloudinary");
const { parseBase64 } = require("./parseBase64");

/**
 * Kiểm tra xem string có phải là URL hợp lệ không
 * @param {string} str
 * @returns {boolean}
 */
function isValidUrl(str) {
  if (typeof str !== "string") return false;
  
  // Nếu đã là Cloudinary URL thì giữ nguyên
  if (str.includes("cloudinary.com")) return false;
  
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Upload ảnh lên Cloudinary
 * Hỗ trợ 3 loại input:
 * 1. Base64 string (data:image/...)
 * 2. URL (http://... hoặc https://...)
 * 3. Cloudinary URL (giữ nguyên)
 *
 * @param {string} file - Base64 string, URL, hoặc Cloudinary URL
 * @param {string} folder - Thư mục trên Cloudinary
 * @returns {Promise<string|null>} - URL của ảnh trên Cloudinary
 */
async function uploadIfNeeded(file, folder = "recipes") {
  if (!file) return null;
  if (typeof file !== "string") return file;


  // Nếu đã là Cloudinary URL thì giữ nguyên
  if (file.includes("cloudinary.com")) {
    return file;
  }

  // Nếu là base64 thì upload lên Cloudinary
  if (file.startsWith("data:")) {
    const { buffer, fakeFileName } = parseBase64(file);
    return await uploadToCloudinary(buffer, fakeFileName, folder);
  }

  // Nếu là URL thì upload trực tiếp từ URL lên Cloudinary
  if (isValidUrl(file)) {
    // Cloudinary sẽ tự lấy ảnh từ URL (không download về server)
    return await uploadToCloudinaryFromUrl(file, folder);
  }

  // Nếu không thuộc các trường hợp trên thì giữ nguyên
  return file;
}

module.exports = {
  uploadIfNeeded,
  isValidUrl,
};
