const axios = require('axios');

// Service URLs - Read from environment variables
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';

/**
 * Gọi auth-service để lấy thông tin user (username)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User info with username
 */
async function getUserFromAuthService(userId) {
    try {
        const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/user/${userId}`);
        return response.data;
    } catch (err) {
        console.error(`❌ Failed to get user from ${AUTH_SERVICE_URL}:`, err.message);
        return null;
    }
}

/**
 * Gọi user-service để lấy profile (avatar)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile with avatar
 */
async function getProfileFromUserService(userId) {
    try {
        const response = await axios.get(`${USER_SERVICE_URL}/api/user/profile/${userId}`);
        return response.data;
    } catch (err) {
        console.error(`❌ Failed to get profile from ${USER_SERVICE_URL}:`, err.message);
        return null;
    }
}

/**
 * Lấy đầy đủ thông tin user (username, firstName, lastName, avatar)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { username, firstName, lastName, avatar }
 */
async function getUserInfo(userId) {
    try {
        // Gọi song song cả 2 services
        const [authData, profileData] = await Promise.all([
            getUserFromAuthService(userId),
            getProfileFromUserService(userId)
        ]);

        return {
            username: authData?.username || 'Anonymous',
            firstName: profileData?.firstName || '',
            lastName: profileData?.lastName || '',
            avatar: profileData?.avatar || null
        };
    } catch (error) {
        console.error('❌ Error fetching user info:', error.message);
        return {
            username: 'Anonymous',
            firstName: '',
            lastName: '',
            avatar: null
        };
    }
}

module.exports = {
    getUserFromAuthService,
    getProfileFromUserService,
    getUserInfo
};
