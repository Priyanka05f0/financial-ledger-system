const accountService = require('../services/accountService');

// Create Account
exports.createAccount = async (req, res) => {
  try {
    const { user_id, account_type, currency } = req.body;

    if (!user_id || !account_type || !currency) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const account = await accountService.createAccount(
      user_id,
      account_type,
      currency
    );

    res.status(201).json(account);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Account With Balance
exports.getAccount = async (req, res) => {
  try {
    const accountId = req.params.id;
    const account = await accountService.getAccountWithBalance(accountId);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(account);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Deposit
exports.deposit = async (req, res) => {
  try {
    const { account_id, amount, currency, description } = req.body;

    if (!account_id || !amount || !currency) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const result = await accountService.deposit(
      account_id,
      amount,
      currency,
      description
    );

    res.status(201).json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Withdraw
exports.withdraw = async (req, res) => {
  try {
    const { account_id, amount, currency, description } = req.body;

    if (!account_id || !amount || !currency) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const result = await accountService.withdraw(
      account_id,
      amount,
      currency,
      description
    );

    res.status(201).json(result);

  } catch (error) {
    if (error.message === 'Insufficient funds') {
      return res.status(422).json({ message: 'Insufficient funds' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Transfer
exports.transfer = async (req, res) => {
  try {
    const {
      source_account,
      destination_account,
      amount,
      currency,
      description
    } = req.body;

    if (!source_account || !destination_account || !amount || !currency) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const result = await accountService.transfer(
      source_account,
      destination_account,
      amount,
      currency,
      description
    );

    res.status(201).json(result);

  } catch (error) {
    if (error.message === 'Insufficient funds') {
      return res.status(422).json({ message: 'Insufficient funds' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Ledger History
exports.getLedger = async (req, res) => {
  try {
    const accountId = req.params.id;
    const ledger = await accountService.getLedger(accountId);
    res.json(ledger);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};