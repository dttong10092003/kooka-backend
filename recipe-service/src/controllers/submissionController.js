const submissionService = require("../services/submissionService");

// Lấy tất cả đề xuất (admin)
exports.getAllSubmissions = async (req, res) => {
  try {
    const { status } = req.query;
    const filters = {};
    
    if (status) {
      filters.status = status;
    }
    
    const submissions = await submissionService.getAllSubmissions(filters);
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy đề xuất của user hiện tại
exports.getMySubmissions = async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    
    const submissions = await submissionService.getUserSubmissions(userId);
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy chi tiết 1 đề xuất
exports.getSubmission = async (req, res) => {
  try {
    const submission = await submissionService.getSubmissionById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Không tìm thấy đề xuất" });
    }
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tạo đề xuất mới (user)
exports.createSubmission = async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const userName = req.user?.name || req.headers['x-user-name'] || 'Anonymous';
    
    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    
    const submission = await submissionService.createSubmission(req.body, userId, userName);
    res.status(201).json({
      message: 'Đề xuất công thức đã được gửi thành công!',
      submission
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Duyệt đề xuất (admin)
exports.approveSubmission = async (req, res) => {
  try {
    const adminId = req.user?.id || req.headers['x-user-id'];
    
    if (!adminId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    
    const result = await submissionService.approveSubmission(req.params.id, adminId);
    res.json({
      message: 'Đề xuất đã được duyệt và công thức đã được tạo!',
      submission: result.submission,
      recipe: result.recipe
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Từ chối đề xuất (admin)
exports.rejectSubmission = async (req, res) => {
  try {
    const adminId = req.user?.id || req.headers['x-user-id'];
    const { reason } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Vui lòng cung cấp lý do từ chối' });
    }
    
    const submission = await submissionService.rejectSubmission(req.params.id, adminId, reason);
    res.json({
      message: 'Đề xuất đã bị từ chối',
      submission
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Xóa đề xuất
exports.deleteSubmission = async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const isAdmin = req.user?.role === 'admin' || req.headers['x-user-role'] === 'admin';
    
    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    
    const submission = await submissionService.deleteSubmission(req.params.id, userId, isAdmin);
    res.json({ 
      message: 'Xóa đề xuất thành công',
      submission 
    });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
};

// Đếm số đề xuất pending (admin)
exports.getPendingCount = async (req, res) => {
  try {
    const count = await submissionService.getPendingCount();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
