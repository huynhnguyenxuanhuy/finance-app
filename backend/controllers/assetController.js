const Asset = require('../models/Asset');

const getAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ userId: req.user._id }).sort({ acquiredAt: -1 });
    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const byType = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.value;
      return acc;
    }, {});

    res.json({ success: true, data: assets, summary: { totalValue, byType, count: assets.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAsset = async (req, res) => {
  try {
    const asset = await Asset.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!asset) return res.status(404).json({ success: false, message: 'Không tìm thấy tài sản' });
    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!asset) return res.status(404).json({ success: false, message: 'Không tìm thấy tài sản' });
    res.json({ success: true, message: 'Đã xóa tài sản' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAssets, createAsset, updateAsset, deleteAsset };
