const pool = require('../db');

// Create Account
exports.createAccount = async (user_id, account_type, currency) => {
  const result = await pool.query(
    `INSERT INTO accounts (user_id, account_type, currency)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [user_id, account_type, currency]
  );

  return result.rows[0];
};

// Get Account With Balance
exports.getAccountWithBalance = async (accountId) => {
  const accountResult = await pool.query(
    `SELECT * FROM accounts WHERE id = $1`,
    [accountId]
  );

  if (accountResult.rows.length === 0) {
    return null;
  }

  const balanceResult = await pool.query(
    `SELECT COALESCE(SUM(
        CASE
          WHEN entry_type = 'credit' THEN amount
          WHEN entry_type = 'debit' THEN -amount
        END
      ), 0) AS balance
     FROM ledger_entries
     WHERE account_id = $1`,
    [accountId]
  );

  const account = accountResult.rows[0];
  account.balance = balanceResult.rows[0].balance;

  return account;
};

// Deposit
exports.deposit = async (accountId, amount, currency, description) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const transactionResult = await client.query(
      `INSERT INTO transactions
       (type, destination_account, amount, currency, status, description)
       VALUES ('deposit', $1, $2, $3, 'pending', $4)
       RETURNING *`,
      [accountId, amount, currency, description]
    );

    const transaction = transactionResult.rows[0];

    await client.query(
      `INSERT INTO ledger_entries
       (account_id, transaction_id, entry_type, amount)
       VALUES ($1, $2, 'credit', $3)`,
      [accountId, transaction.id, amount]
    );

    await client.query(
      `UPDATE transactions SET status = 'completed' WHERE id = $1`,
      [transaction.id]
    );

    await client.query('COMMIT');

    return {
      message: 'Deposit successful',
      transaction_id: transaction.id
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

exports.withdraw = async (accountId, amount, currency, description) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 🔒 LOCK the account row (prevents race condition)
    const accountLock = await client.query(
      `SELECT * FROM accounts WHERE id = $1 FOR UPDATE`,
      [accountId]
    );

    if (accountLock.rows.length === 0) {
      throw new Error('Account not found');
    }

    // ✅ Check current balance (after locking)
    const balanceResult = await client.query(
      `SELECT COALESCE(SUM(
        CASE
          WHEN entry_type = 'credit' THEN amount
          WHEN entry_type = 'debit' THEN -amount
        END
      ), 0) AS balance
      FROM ledger_entries
      WHERE account_id = $1`,
      [accountId]
    );

    const currentBalance = parseFloat(balanceResult.rows[0].balance);

    if (currentBalance < amount) {
      throw new Error('Insufficient funds');
    }

    // ✅ Create transaction
    const transactionResult = await client.query(
      `INSERT INTO transactions
       (type, source_account, amount, currency, status, description)
       VALUES ('withdrawal', $1, $2, $3, 'pending', $4)
       RETURNING *`,
      [accountId, amount, currency, description]
    );

    const transaction = transactionResult.rows[0];

    // ✅ Create ledger debit entry
    await client.query(
      `INSERT INTO ledger_entries
       (account_id, transaction_id, entry_type, amount)
       VALUES ($1, $2, 'debit', $3)`,
      [accountId, transaction.id, amount]
    );

    // ✅ Mark transaction completed
    await client.query(
      `UPDATE transactions SET status = 'completed' WHERE id = $1`,
      [transaction.id]
    );

    await client.query('COMMIT');

    return {
      message: 'Withdrawal successful',
      transaction_id: transaction.id
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Transfer
exports.transfer = async (
  sourceAccount,
  destinationAccount,
  amount,
  currency,
  description
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const balanceResult = await client.query(
      `SELECT COALESCE(SUM(
        CASE
          WHEN entry_type = 'credit' THEN amount
          WHEN entry_type = 'debit' THEN -amount
        END
      ), 0) AS balance
      FROM ledger_entries
      WHERE account_id = $1`,
      [sourceAccount]
    );

    const currentBalance = parseFloat(balanceResult.rows[0].balance);

    if (currentBalance < amount) {
      throw new Error('Insufficient funds');
    }

    const transactionResult = await client.query(
      `INSERT INTO transactions
       (type, source_account, destination_account, amount, currency, status, description)
       VALUES ('transfer', $1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [sourceAccount, destinationAccount, amount, currency, description]
    );

    const transaction = transactionResult.rows[0];

    await client.query(
      `INSERT INTO ledger_entries
       (account_id, transaction_id, entry_type, amount)
       VALUES ($1, $2, 'debit', $3)`,
      [sourceAccount, transaction.id, amount]
    );

    await client.query(
      `INSERT INTO ledger_entries
       (account_id, transaction_id, entry_type, amount)
       VALUES ($1, $2, 'credit', $3)`,
      [destinationAccount, transaction.id, amount]
    );

    await client.query(
      `UPDATE transactions SET status = 'completed' WHERE id = $1`,
      [transaction.id]
    );

    await client.query('COMMIT');

    return {
      message: 'Transfer successful',
      transaction_id: transaction.id
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Ledger History
exports.getLedger = async (accountId) => {
  const result = await pool.query(
    `SELECT * FROM ledger_entries
     WHERE account_id = $1
     ORDER BY created_at ASC`,
    [accountId]
  );

  return result.rows;
};