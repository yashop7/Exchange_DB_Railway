import { Client } from "pg";
import { dbUrl } from "./config";

const client = new Client({
  connectionString: dbUrl, // Railway's full connection URL
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false, // Required for Railway
});

async function initializeDB() {
  await client
    .connect()
    .then(() => console.log("🚀 Connected to Railway PostgreSQL!"))
    .catch((err) => console.error("❌ Connection error", err));
  try {
    // First drop the materialized views if they exist
    await client.query(`
      DROP MATERIALIZED VIEW IF EXISTS klines_1m;
      DROP MATERIALIZED VIEW IF EXISTS klines_1h;
      DROP MATERIALIZED VIEW IF EXISTS klines_1w;
    `);

    // Then drop and recreate the main table
    await client.query(`
      DROP TABLE IF EXISTS "tata_prices";
      CREATE TABLE "tata_prices"(
          time            TIMESTAMP WITH TIME ZONE NOT NULL,
          price          DOUBLE PRECISION,
          volume         DOUBLE PRECISION,
          currency_code  VARCHAR(10)
      );
    `);

    // Create the hypertable
    await client.query(`
      SELECT create_hypertable('tata_prices', 'time');
    `);

    // Recreate the materialized views
    await client.query(`
      CREATE MATERIALIZED VIEW klines_1m AS
      SELECT
          time_bucket('1 minute', time) AS bucket,
          first(price, time) AS open,
          max(price) AS high,
          min(price) AS low,
          last(price, time) AS close,
          sum(volume) AS volume,
          currency_code
      FROM tata_prices
      GROUP BY bucket, currency_code;
    `);

    await client.query(`
      CREATE MATERIALIZED VIEW klines_1h AS
      SELECT
          time_bucket('1 hour', time) AS bucket,
          first(price, time) AS open,
          max(price) AS high,
          min(price) AS low,
          last(price, time) AS close,
          sum(volume) AS volume,
          currency_code
      FROM tata_prices
      GROUP BY bucket, currency_code;
    `);

    await client.query(`
      CREATE MATERIALIZED VIEW klines_1w AS
      SELECT
          time_bucket('1 week', time) AS bucket,
          first(price, time) AS open,
          max(price) AS high,
          min(price) AS low,
          last(price, time) AS close,
          sum(volume) AS volume,
          currency_code
      FROM tata_prices
      GROUP BY bucket, currency_code;
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    await client.end();
  }
}

initializeDB().catch(console.error);
