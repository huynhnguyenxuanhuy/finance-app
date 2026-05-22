const Asset = require('../models/Asset');

const ALLOCATABLE_TYPES = ['savings', 'stock', 'gold', 'other'];

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

const allocateCash = async (req, res) => {
  try {
    const { fromAssetId, name, type, value, acquiredAt, note } = req.body;
    const amount = Number(value);

    if (!fromAssetId || !name || !type || !amount) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin phân bổ' });
    }
    if (!ALLOCATABLE_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Loại phân bổ không hợp lệ' });
    }

    const cashAsset = await Asset.findOne({ _id: fromAssetId, userId: req.user._id, type: 'cash' });
    if (!cashAsset) return res.status(404).json({ success: false, message: 'Không tìm thấy tài sản tiền mặt' });
    if (cashAsset.value < amount) {
      return res.status(400).json({ success: false, message: 'Số dư tiền mặt không đủ để phân bổ' });
    }

    cashAsset.value -= amount;
    await cashAsset.save();

    const allocatedAsset = await Asset.create({
      userId: req.user._id,
      name,
      type,
      value: amount,
      acquiredAt: acquiredAt || new Date(),
      note: note || `Phân bổ từ ${cashAsset.name}`,
      sourceAssetId: cashAsset._id,
    });

    res.status(201).json({ success: true, data: { cashAsset, allocatedAsset } });
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

module.exports = { getAssets, createAsset, updateAsset, allocateCash, deleteAsset };
