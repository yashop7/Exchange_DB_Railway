import { Client } from 'pg';
import { createClient } from 'redis';  
import { DbMessage } from './types';
import { dbUrl, redisUrl } from './config';

const pgClient = new Client({
    connectionString: dbUrl, // Railway's full connection URL
  });
  
  pgClient
    .connect()
    .then(() => console.log("🚀 Connected to Railway PostgreSQL!"))
    .catch((err) => console.error("❌ Connection error", err));
  
async function main() {
    const redisClient = createClient({
        url : redisUrl
    });
    await redisClient.connect();
    console.log("connected to redis");

    while (true) {
        const response = await redisClient.rPop("db_processor" as string)
        if (!response) {

        }  else {
            const data: DbMessage = JSON.parse(response);
            if (data.type === "TRADE_ADDED") {
                try {
                    console.log("Adding trade data...");
                    const { price, timestamp } = data.data;
                    const formattedTimestamp = new Date(timestamp);
                    
                    const query = 'INSERT INTO tata_prices (time, price) VALUES ($1, $2)';
                    const values = [formattedTimestamp, price];
                    
                    await pgClient.query(query, values);
                    console.log("Trade data added successfully");
                } catch (error) {
                    console.error("Error in trade processing:", {
                        error,
                        data: data.data,
                        timestamp: new Date(data.data.timestamp),
                        price: data.data.price
                    });
                    // You might want to add error handling logic here
                    // For example, storing failed records or retrying
                }
            }
        }
    }

}

main();