import cloudinary from '../config/cloudinary.js';
import DatauriParser from 'datauri/parser.js';
import path from 'path';

const parser = new DatauriParser();

/**
 * Convert buffer to data URI
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} fileName - Original file name
 * @returns {Object} Data URI object
 */
export const bufferToDataURI = (fileBuffer, fileName) => {
  const extname = path.extname(fileName).toString();
  return parser.format(extname, fileBuffer);
};

/**
 * Upload avatar to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} fileName - Original file name
 * @param {String} userId - User ID for unique naming
 * @returns {Promise<String>} Cloudinary secure URL
 */
export const uploadAvatarToCloudinary = async (fileBuffer, fileName, userId) => {
  try {
    const file = bufferToDataURI(fileBuffer, fileName);

    const result = await cloudinary.uploader.upload(file.content, {
      folder: 'moviehub/avatars',
      public_id: `user_${userId}_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      overwrite: true,
      resource_type: 'image'
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Upload community banner to Cloudinary
 * @param {String} base64Data - Base64 encoded image data
 * @param {String} communityId - Community ID for unique naming
 * @returns {Promise<String>} Cloudinary secure URL
 */
export const uploadCommunityBannerToCloudinary = async (base64Data, communityId) => {
  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'moviehub/communities/banners',
      public_id: `community_${communityId}_banner_${Date.now()}`,
      transformation: [
        { width: 1200, height: 300, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      overwrite: true,
      resource_type: 'image'
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary banner upload error:', error);
    throw new Error('Failed to upload banner to Cloudinary');
  }
};

/**
 * Upload community icon to Cloudinary
 * @param {String} base64Data - Base64 encoded image data
 * @param {String} communityId - Community ID for unique naming
 * @returns {Promise<String>} Cloudinary secure URL
 */
export const uploadCommunityIconToCloudinary = async (base64Data, communityId) => {
  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'moviehub/communities/icons',
      public_id: `community_${communityId}_icon_${Date.now()}`,
      transformation: [
        { width: 256, height: 256, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      overwrite: true,
      resource_type: 'image'
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary icon upload error:', error);
    throw new Error('Failed to upload icon to Cloudinary');
  }
};

/**
 * Upload post images to Cloudinary
 * @param {Array<String>} base64Images - Array of base64 encoded images
 * @param {String} postId - Post ID for unique naming
 * @returns {Promise<Array<String>>} Array of Cloudinary secure URLs
 */
export const uploadPostImagesToCloudinary = async (base64Images, postId) => {
  try {
    const uploadPromises = base64Images.map(async (base64Data, index) => {
      const result = await cloudinary.uploader.upload(base64Data, {
        folder: 'moviehub/posts',
        public_id: `post_${postId}_${index}_${Date.now()}`,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ],
        resource_type: 'auto'
      });
      return result.secure_url;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Cloudinary post images upload error:', error);
    throw new Error('Failed to upload post images to Cloudinary');
  }
};

/**
 * Upload chat media to Cloudinary
 * @param {String} base64Data - Base64 encoded media data
 * @param {String} conversationId - Conversation ID for unique naming
 * @param {String} type - Media type ('image', 'video', 'gif', 'sticker')
 * @returns {Promise<String>} Cloudinary secure URL
 */
export const uploadChatMediaToCloudinary = async (base64Data, conversationId, type) => {
  try {
    const resourceType = type === 'video' ? 'video' : type === 'gif' ? 'image' : 'image';
    
    let format;
    let transformation = [];

    if (type === 'video') {
      format = 'mp4';
      transformation.push({ quality: 'auto' });
    } else if (type === 'gif') {
      format = 'gif';
      transformation.push({ quality: 'auto' });
    } else if (type === 'sticker') {
      format = 'webp';
      transformation.push({ width: 256, height: 256, crop: 'fit', quality: 'auto' });
    } else {
      format = 'jpg';
      transformation.push({ quality: 'auto' });
    }

    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'moviehub/chats',
      public_id: `chat_${conversationId}_${Date.now()}`,
      transformation,
      format,
      overwrite: true,
      resource_type: resourceType
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary chat media upload error:', error);
    throw new Error('Failed to upload chat media to Cloudinary');
  }
};

/**
 * Upload post videos to Cloudinary
 * @param {Array<String>} base64Videos - Array of base64 encoded videos
 * @param {String} postId - Post ID for unique naming
 * @returns {Promise<Array<String>>} Array of Cloudinary secure URLs
 */
export const uploadPostVideosToCloudinary = async (base64Videos, postId) => {
  try {
    const uploadPromises = base64Videos.map(async (base64Data, index) => {
      const result = await cloudinary.uploader.upload(base64Data, {
        folder: 'moviehub/posts/videos',
        public_id: `video_${postId}_${index}_${Date.now()}`,
        resource_type: 'video',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'mp4' }
        ],
        overwrite: true,
        chunk_size: 6000000 // 6MB chunks for large files
      });

      return result.secure_url;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Cloudinary post videos upload error:', error);
    throw new Error('Failed to upload post videos to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param {String} imageUrl - Cloudinary image URL
 * @returns {Promise<void>}
 */
export const deleteImageFromCloudinary = async (imageUrl) => {
  try {
    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split('/');
    const publicIdWithExt = urlParts.slice(-2).join('/');
    const publicId = publicIdWithExt.split('.')[0];

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<String>} imageUrls - Array of Cloudinary image URLs
 * @returns {Promise<void>}
 */
export const deleteMultipleImagesFromCloudinary = async (imageUrls) => {
  try {
    const deletePromises = imageUrls.map(url => deleteImageFromCloudinary(url));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Cloudinary multiple delete error:', error);
    throw new Error('Failed to delete images from Cloudinary');
  }
};
