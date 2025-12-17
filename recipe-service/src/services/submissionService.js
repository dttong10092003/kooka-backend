const RecipeSubmission = require("../models/RecipeSubmission");
const Recipe = require("../models/Recipe");
const RecipeIngredientUnit = require("../models/RecipeIngredientUnit");
const { uploadIfNeeded } = require("../utils/imageUploader");
const axios = require("axios");

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3012';

// Lấy tất cả đề xuất (cho admin)
async function getAllSubmissions(filters = {}) {
  const query = {};
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.submittedBy) {
    query.submittedBy = filters.submittedBy;
  }

  return await RecipeSubmission.find(query)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name")
    .sort({ createdAt: -1 }); // Mới nhất trước
}

// Lấy đề xuất của user cụ thể
async function getUserSubmissions(userId) {
  return await RecipeSubmission.find({ submittedBy: userId })
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name")
    .sort({ createdAt: -1 });
}

// Lấy chi tiết 1 đề xuất
async function getSubmissionById(id) {
  const submission = await RecipeSubmission.findById(id)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
  
  if (!submission) return null;
  
  // Lấy thông tin số lượng và đơn vị từ database riêng
  const ingredientUnits = await RecipeIngredientUnit.find({ 
    recipeId: id,
    isSubmission: true 
  });
  
  const submissionObj = submission.toObject();
  submissionObj.ingredientsWithDetails = submissionObj.ingredients.map(ing => {
    const unitInfo = ingredientUnits.find(u => u.ingredientId.toString() === ing._id.toString());
    return {
      id: ing._id,
      name: ing.name,
      quantity: unitInfo?.quantity || 1,
      unit: unitInfo?.unit || 'gram'
    };
  });
  
  return submissionObj;
}

// Tạo đề xuất mới (user submit)
async function createSubmission(data, userId, userName) {
  console.log(`[Create Submission] User ${userId} submitting recipe: ${data.name}`);
  const startTime = Date.now();

  // Upload ảnh chính
  if (data.image) {
    data.image = await uploadIfNeeded(data.image, "submissions");
  }

  // Upload ảnh trong instructions
  if (Array.isArray(data.instructions)) {
    const uploadPromises = data.instructions.map(async (step) => {
      if (Array.isArray(step.images)) {
        const limitedImages = step.images.slice(0, 4);
        const uploadedImages = await Promise.all(
          limitedImages.map(img => uploadIfNeeded(img, "submissions/steps"))
        );
        step.images = uploadedImages;
      } else if (typeof step.images === "string") {
        step.images = [await uploadIfNeeded(step.images, "submissions/steps")];
      }
      return step;
    });
    await Promise.all(uploadPromises);
  }

  try {
    const submission = new RecipeSubmission({
      ...data,
      submittedBy: userId,
      submittedByName: userName,
      status: 'pending'
    });
    
    const saved = await submission.save();

    // Lưu thông tin số lượng và đơn vị (đánh dấu là submission)
    if (data.ingredientsWithDetails && Array.isArray(data.ingredientsWithDetails)) {
      const unitPromises = data.ingredientsWithDetails.map(detail => {
        return RecipeIngredientUnit.create({
          recipeId: saved._id,
          ingredientId: detail.ingredientId || detail.id,
          quantity: detail.quantity,
          unit: detail.unit,
          isSubmission: true
        });
      });
      await Promise.all(unitPromises);
      console.log(`[Create Submission] ✅ Saved ingredient units`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Create Submission] ✅ Submission created successfully in ${totalTime}ms`);

    // Gửi thông báo cho admin
    notifyAdminNewSubmission(saved._id, saved.name, saved.submittedByName, saved.image)
      .catch(err => console.error('[Create Submission] Failed to notify admin:', err.message));

    return saved;
  } catch (error) {
    console.error(`[Create Submission] ❌ Failed:`, error.message);
    throw error;
  }
}

// Duyệt đề xuất (admin approve)
async function approveSubmission(submissionId, adminId) {
  console.log(`[Approve Submission] Admin ${adminId} approving submission ${submissionId}`);

  const submission = await RecipeSubmission.findById(submissionId);
  if (!submission) {
    throw new Error('Không tìm thấy đề xuất');
  }

  if (submission.status !== 'pending') {
    throw new Error('Đề xuất này đã được xử lý');
  }

  try {
    // Tạo recipe từ submission
    const recipeData = {
      name: submission.name,
      ingredients: submission.ingredients,
      tags: submission.tags,
      short: submission.short,
      instructions: submission.instructions,
      image: submission.image,
      video: submission.video,
      calories: submission.calories,
      time: submission.time,
      size: submission.size,
      difficulty: submission.difficulty,
      cuisine: submission.cuisine,
      category: submission.category,
      rate: 0,
      numberOfRate: 0
    };

    const recipe = new Recipe(recipeData);
    const savedRecipe = await recipe.save();

    // Copy ingredient units từ submission sang recipe
    const submissionUnits = await RecipeIngredientUnit.find({ 
      recipeId: submissionId,
      isSubmission: true 
    });

    const recipeUnitPromises = submissionUnits.map(unit => {
      return RecipeIngredientUnit.create({
        recipeId: savedRecipe._id,
        ingredientId: unit.ingredientId,
        quantity: unit.quantity,
        unit: unit.unit,
        isSubmission: false
      });
    });
    await Promise.all(recipeUnitPromises);

    // Cập nhật submission status
    submission.status = 'approved';
    submission.approvedBy = adminId;
    submission.approvedAt = new Date();
    submission.recipeId = savedRecipe._id;
    await submission.save();

    console.log(`[Approve Submission] ✅ Approved and created recipe ${savedRecipe._id}`);

    // Gửi thông báo cho user
    notifyUserSubmissionApproved(
      submission.submittedBy,
      submission.name,
      savedRecipe._id,
      savedRecipe.image
    ).catch(err => console.error('[Approve Submission] Failed to notify user:', err.message));

    return {
      submission,
      recipe: savedRecipe
    };
  } catch (error) {
    console.error(`[Approve Submission] ❌ Failed:`, error.message);
    throw error;
  }
}

// Từ chối đề xuất (admin reject)
async function rejectSubmission(submissionId, adminId, reason) {
  console.log(`[Reject Submission] Admin ${adminId} rejecting submission ${submissionId}`);

  const submission = await RecipeSubmission.findById(submissionId);
  if (!submission) {
    throw new Error('Không tìm thấy đề xuất');
  }

  if (submission.status !== 'pending') {
    throw new Error('Đề xuất này đã được xử lý');
  }

  submission.status = 'rejected';
  submission.approvedBy = adminId;
  submission.approvedAt = new Date();
  submission.rejectionReason = reason;
  await submission.save();

  console.log(`[Reject Submission] ✅ Rejected submission ${submissionId}`);

  // Gửi thông báo cho user
  notifyUserSubmissionRejected(
    submission.submittedBy,
    submission.name,
    reason,
    submission.image
  ).catch(err => console.error('[Reject Submission] Failed to notify user:', err.message));

  return submission;
}

// Xóa đề xuất (chỉ user xóa đề xuất của mình hoặc admin)
async function deleteSubmission(submissionId, userId, isAdmin = false) {
  const submission = await RecipeSubmission.findById(submissionId);
  if (!submission) {
    throw new Error('Không tìm thấy đề xuất');
  }

  // Kiểm tra quyền
  if (!isAdmin && submission.submittedBy !== userId) {
    throw new Error('Bạn không có quyền xóa đề xuất này');
  }

  // Xóa ingredient units liên quan
  await RecipeIngredientUnit.deleteMany({ 
    recipeId: submissionId,
    isSubmission: true 
  });

  await RecipeSubmission.findByIdAndDelete(submissionId);
  console.log(`[Delete Submission] ✅ Deleted submission ${submissionId}`);

  return submission;
}

// Đếm số lượng đề xuất pending (cho admin)
async function getPendingCount() {
  return await RecipeSubmission.countDocuments({ status: 'pending' });
}

// Thông báo cho admin khi có đề xuất mới
async function notifyAdminNewSubmission(submissionId, recipeName, userName, recipeImage) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/new-submission`, {
      submissionId,
      recipeName,
      userName,
      recipeImage
    });
    console.log(`✅ Sent new submission notification to admin`);
  } catch (err) {
    console.error('❌ Failed to send admin notification:', err.message);
  }
}

// Thông báo cho user khi đề xuất được duyệt
async function notifyUserSubmissionApproved(userId, recipeName, recipeId, recipeImage) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/submission-approved`, {
      userId,
      recipeName,
      recipeId,
      recipeImage
    });
    console.log(`✅ Sent approval notification to user ${userId}`);
  } catch (err) {
    console.error('❌ Failed to send approval notification:', err.message);
  }
}

// Thông báo cho user khi đề xuất bị từ chối
async function notifyUserSubmissionRejected(userId, recipeName, reason, recipeImage) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/submission-rejected`, {
      userId,
      recipeName,
      reason,
      recipeImage
    });
    console.log(`✅ Sent rejection notification to user ${userId}`);
  } catch (err) {
    console.error('❌ Failed to send rejection notification:', err.message);
  }
}

module.exports = {
  getAllSubmissions,
  getUserSubmissions,
  getSubmissionById,
  createSubmission,
  approveSubmission,
  rejectSubmission,
  deleteSubmission,
  getPendingCount
};
