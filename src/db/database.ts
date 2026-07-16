import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDB = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('apexbytes_lmcc.db');
  return db;
};

export const initDatabase = async () => {
  const database = await getDB();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL CHECK(length(full_name) >= 2),
      phone_number TEXT,
      id_number TEXT,
      address TEXT,
      notes TEXT,
      sms_receipts INTEGER DEFAULT 1,
      date_added TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      loan_date TEXT NOT NULL,
      original_cow REAL NOT NULL,
      current_cow REAL NOT NULL,
      current_calf REAL NOT NULL,
      total_due REAL NOT NULL,
      total_paid REAL DEFAULT 0,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Paid','Overdue','Capped')),
      last_compound_date TEXT,
      notes TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id TEXT NOT NULL,
      payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      amount REAL NOT NULL,
      interest_paid REAL NOT NULL,
      principal_paid REAL NOT NULL,
      penalty_fee REAL DEFAULT 0,
      remaining_cow REAL NOT NULL,
      new_calf REAL NOT NULL,
      new_total_due REAL NOT NULL,
      receipt_number TEXT NOT NULL UNIQUE,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT
    );
  `);
};

export const generateLoanId = async (db: SQLite.SQLiteDatabase): Promise<string> => {
  const result = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM loans`);
  const num = (result?.count || 0) + 1;
  return `LN-${String(num).padStart(6, '0')}`;
};

export const generateReceiptNumber = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${y}${m}${day}-${rand}`;
};
