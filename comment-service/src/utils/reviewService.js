const axios = require('axios');

const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://review-service:5007';

const createReview = async (recipeId, userId, commentId, rating) => {
    try {
        const response = await axios.post(`${REVIEW_SERVICE_URL}/api/reviews`, {
            recipeId,
            userId,
            commentId,
            rating
        }, {
            headers: {
                'x-user-id': userId  // Truyền userId qua header
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error creating review:', error.response?.data || error.message);
        throw new Error('Failed to create review');
    }
};

const updateReview = async (commentId, userId, rating) => {
    try {
        const response = await axios.put(`${REVIEW_SERVICE_URL}/api/reviews/comment/${commentId}`, {
            rating
        }, {
            headers: {
                'x-user-id': userId  // Truyền userId qua header
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error updating review:', error.response?.data || error.message);
        throw new Error('Failed to update review');
    }
};

const deleteReview = async (commentId, userId) => {
    try {
        const response = await axios.delete(`${REVIEW_SERVICE_URL}/api/reviews/comment/${commentId}`, {
            headers: {
                'x-user-id': userId  // Truyền userId qua header
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting review:', error.response?.data || error.message);
        // Không throw error vì có thể comment không có review (reply)
        return null;
    }
};

module.exports = {
    createReview,
    updateReview,
    deleteReview
};
