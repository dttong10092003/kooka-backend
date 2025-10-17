const axios = require('axios');

// Service URLs - thử cả Docker và Local
const AUTH_SERVICE_URLS = [
    'http://auth-service:5001',  // Docker
    'http://localhost:5001'      // Local
];

const USER_SERVICE_URLS = [
    'http://user-service:5002',  // Docker
    'http://localhost:5002'      // Local
];

/**
 * Gọi auth-service để lấy thông tin user (username)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User info with username
 */
async function getUserFromAuthService(userId) {
    for (const baseUrl of AUTH_SERVICE_URLS) {
        try {
            const response = await axios.get(`${baseUrl}/api/auth/user/${userId}`);
            return response.data;
        } catch (err) {
            console.error(`❌ Failed to get user from ${baseUrl}:`, err.message);
        }
    }
    console.warn(`⚠️  Could not fetch user from auth-service for userId: ${userId}`);
    return null;
}

/**
 * Gọi user-service để lấy profile (avatar)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile with avatar
 */
async function getProfileFromUserService(userId) {
    for (const baseUrl of USER_SERVICE_URLS) {
        try {
            const response = await axios.get(`${baseUrl}/api/user/profile/${userId}`);
            return response.data;
        } catch (err) {
            console.error(`❌ Failed to get profile from ${baseUrl}:`, err.message);
        }
    }
    console.warn(`⚠️  Could not fetch profile from user-service for userId: ${userId}`);
    return null;
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
