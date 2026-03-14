// backend/utils/cloudinaryUpload.js
const uploadImage = async (base64Image) => {
  // If no image or already a URL, return as-is
  if (!base64Image || base64Image.startsWith('http')) return base64Image;

  // If Cloudinary keys not configured, return base64 as-is (local dev)
  if (!process.env.CLOUDINARY_CLOUD_NAME) return base64Image;

  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const result = await cloudinary.uploader.upload(base64Image, {
    folder: 'donateo',
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
  });
  return result.secure_url;
};

module.exports = { uploadImage };