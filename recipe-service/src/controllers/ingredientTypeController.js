const typeService = require("../services/ingredientTypeService");

exports.getTypes = async (req, res) => {
  try {
    const types = await typeService.getAllTypes();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getType = async (req, res) => {
  try {
    const type = await typeService.getTypeById(req.params.id);
    if (!type) return res.status(404).json({ message: "Không tìm thấy loại nguyên liệu" });
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createType = async (req, res) => {
  try {
    const type = await typeService.createType(req.body);
    res.status(201).json(type);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateType = async (req, res) => {
  try {
    const type = await typeService.updateType(req.params.id, req.body);
    if (!type) return res.status(404).json({ message: "Không tìm thấy loại nguyên liệu" });
    res.json(type);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteType = async (req, res) => {
  try {
    const type = await typeService.deleteType(req.params.id);
    if (!type) return res.status(404).json({ message: "Không tìm thấy loại nguyên liệu" });
    res.json({ message: "Xóa loại nguyên liệu thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
