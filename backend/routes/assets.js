const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAssets, createAsset, updateAsset, allocateCash, deleteAsset } = require('../controllers/assetController');

router.use(protect);
router.route('/').get(getAssets).post(createAsset);
router.post('/allocate', allocateCash);
router.route('/:id').put(updateAsset).delete(deleteAsset);

module.exports = router;
