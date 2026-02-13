const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.post('/accounts', accountController.createAccount);
router.get('/accounts/:id', accountController.getAccount);
router.post('/deposits', accountController.deposit);
router.post('/withdrawals', accountController.withdraw);
router.post('/transfers', accountController.transfer);
router.get('/accounts/:id/ledger', accountController.getLedger);

module.exports = router;