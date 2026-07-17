import * as SQLite from 'expo-sqlite'

let dbInstance: SQLite.SQLiteDatabase | null = null

export async function getDB() {
  if (dbInstance) return dbInstance
  dbInstance = await SQLite.openDatabaseAsync('lmcc.db')
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone_number TEXT,
      id_number TEXT,
      address TEXT,
      notes TEXT,
      sms_receipts INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      principal REAL NOT NULL,
      monthly_rate REAL NOT NULL,
      term_weeks INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      total_due REAL NOT NULL,
      accrued_interest REAL NOT NULL DEFAULT 0,
      last_accrual_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_at TEXT DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
  return dbInstance
}

// Call on screen focus to accrue overdue interest and flip statuses.
// Cheap — only touches loans that aren't already Cleared.
export async function refreshLoanStatuses() {
  const db = await getDB()
  const { recalculateLoanStatus } = await import('@/src/utils/formatters')
  const loans = await db.getAllAsync<any>(`SELECT * FROM loans WHERE status != 'Cleared'`)
  for (const loan of loans) {
    const updated = recalculateLoanStatus(loan)
    if (updated.status !== loan.status || updated.total_due !== loan.total_due) {
      await db.runAsync(
        `UPDATE loans SET total_due=?, accrued_interest=?, status=?, last_accrual_date=? WHERE id=?`,
        [updated.total_due, updated.accrued_interest, updated.status, updated.last_accrual_date, loan.id]
      )
    }
  }
}
