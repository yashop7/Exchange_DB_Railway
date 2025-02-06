require('dotenv').config();

export const redisUrl = process.env.REDIS_IO; // Your Upstash Redis URL
export const dbUrl = process.env.DATABASE_URL; // Your Railway PostgreSQL URL