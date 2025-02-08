import { Client } from 'pg'; 
import { dbUrl } from './config';


const client = new Client({
    connectionString: dbUrl, // Railway's full connection URL
  });
  
  client
    .connect()
    .then(() => console.log("🚀 Connected to Railway PostgreSQL!"))
    .catch((err) => console.error("❌ Connection error", err));

async function refreshViews() {

    await client.query('REFRESH MATERIALIZED VIEW klines_1m');
    await client.query('REFRESH MATERIALIZED VIEW klines_1h');
    await client.query('REFRESH MATERIALIZED VIEW klines_1w');

    console.log("Materialized views refreshed successfully");
}

refreshViews().catch(console.error);

setInterval(() => {
    refreshViews()
}, 1000 * 60 * 5);