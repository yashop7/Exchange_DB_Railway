import { Pool, PoolClient } from 'pg';

interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: {
    connection: boolean;
    writePermission: boolean;
    readOperation: boolean;
    transaction: boolean;
    retrievedData?: any;
  };
  error?: {
    code?: string;
    message: string;
    detail?: string;
    hint?: string;
  };
}

interface DiagnosticTestData {
  id: number;
  test_data: string;
  created_at: Date;
}

class DatabaseDiagnostic {
  private pool: Pool;
  private client: PoolClient | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000,
    });
  }

  private async connect(): Promise<void> {
    this.client = await this.pool.connect();
  }

  private async createTestTable(): Promise<void> {
    if (!this.client) throw new Error('No database connection');
    
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS diagnostic_test (
        id SERIAL PRIMARY KEY,
        test_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async testWrite(): Promise<void> {
    if (!this.client) throw new Error('No database connection');
    
    await this.client.query(`
      INSERT INTO diagnostic_test (test_data) 
      VALUES ('test_entry');
    `);
  }

  private async testRead(): Promise<DiagnosticTestData> {
    if (!this.client) throw new Error('No database connection');
    
    const result = await this.client.query<DiagnosticTestData>(
      'SELECT * FROM diagnostic_test ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0];
  }

  private async testTransaction(): Promise<void> {
    if (!this.client) throw new Error('No database connection');
    
    try {
      await this.client.query('BEGIN');
      await this.client.query(`
        INSERT INTO diagnostic_test (test_data) 
        VALUES ('transaction_test');
      `);
      await this.client.query('COMMIT');
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    if (!this.client) return;
    
    try {
      await this.client.query('DROP TABLE IF EXISTS diagnostic_test');
    } finally {
      this.client.release();
      await this.pool.end();
    }
  }

  public async runDiagnostic(): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      success: false,
      message: '',
      details: {
        connection: false,
        writePermission: false,
        readOperation: false,
        transaction: false,
      },
    };

    try {
      // Test 1: Connection
      await this.connect();
      result.details!.connection = true;
      console.log('✓ Successfully connected to database');

      // Test 2: Write Permission
      await this.createTestTable();
      await this.testWrite();
      result.details!.writePermission = true;
      console.log('✓ Successfully created table and inserted data');

      // Test 3: Read Operation
      const readData = await this.testRead();
      result.details!.readOperation = true;
      result.details!.retrievedData = readData;
      console.log('✓ Successfully retrieved data:', readData);

      // Test 4: Transaction
      await this.testTransaction();
      result.details!.transaction = true;
      console.log('✓ Successfully completed transaction test');

      result.success = true;
      result.message = 'All diagnostic tests passed successfully';

    } catch (error: any) {
      result.success = false;
      result.message = 'Diagnostic failed';
      result.error = {
        code: error.code,
        message: error.message,
        detail: error.detail,
        hint: error.hint,
      };
      console.error('Diagnostic Error:', result.error);
    } finally {
      await this.cleanup();
    }

    return result;
  }
}

// Example usage
async function runDatabaseDiagnostic(connectionString: string): Promise<void> {
  const diagnostic = new DatabaseDiagnostic(connectionString);
  const result = await diagnostic.runDiagnostic();
  console.log('Diagnostic Result:', JSON.stringify(result, null, 2));
}

export { DatabaseDiagnostic, runDatabaseDiagnostic, DiagnosticResult };