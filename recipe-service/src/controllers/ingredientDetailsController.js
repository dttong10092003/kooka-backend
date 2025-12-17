const RecipeIngredientUnit = require("../models/RecipeIngredientUnit");

// Lấy ingredient details theo recipe ID hoặc submission ID
exports.getIngredientDetailsByRecipeId = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { isSubmission } = req.query; // Optional: filter by submission status
    
    // Build query
    const query = { recipeId };
    
    // Nếu có parameter isSubmission, filter theo đó
    if (isSubmission !== undefined) {
      query.isSubmission = isSubmission === 'true';
    }
    
    // Query ingredient details và populate tên nguyên liệu
    const ingredientDetails = await RecipeIngredientUnit.find(query)
      .populate('ingredientId', 'name') // Populate để lấy tên nguyên liệu
      .select('ingredientId quantity unit recipeId isSubmission')
      .lean();
    
    // Format response để match với format mong muốn
    const formattedDetails = ingredientDetails.map(detail => ({
      _id: detail._id,
      ingredientId: detail.ingredientId, // Đã được populate
      quantity: detail.quantity,
      unit: detail.unit,
      recipeId: detail.recipeId,
      isSubmission: detail.isSubmission
    }));
    
    res.json(formattedDetails);
  } catch (error) {
    console.error('Error fetching ingredient details:', error);
    res.status(500).json({ error: error.message });
  }
};
