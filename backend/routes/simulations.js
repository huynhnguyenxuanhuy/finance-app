const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { runSimulation, getSimulations, getSimulation, deleteSimulation } = require('../controllers/simulationController');

router.use(protect);
router.post('/run', runSimulation);
router.get('/', getSimulations);
router.get('/:id', getSimulation);
router.delete('/:id', deleteSimulation);

module.exports = router;
