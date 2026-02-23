import 'dotenv/config';

export default {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'tms_dev',
      user: process.env.DB_USER || 'mobirapid',
      ...(process.env.DB_PASSWORD ? { password: process.env.DB_PASSWORD } : {}),
    },
    migrations: {
      directory: './db/migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: './db/migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
