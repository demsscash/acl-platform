export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER || 'acl_user',
    password: process.env.DATABASE_PASSWORD || 'acl_password',
    name: process.env.DATABASE_NAME || 'acl_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  gps: {
    apiUrl: process.env.WHATSGPS_API_URL,
    apiKey: process.env.WHATSGPS_API_KEY,
    account: process.env.WHATSGPS_ACCOUNT,
    syncInterval: parseInt(process.env.GPS_SYNC_INTERVAL_SECONDS ?? '60', 10),
  },
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '10485760', 10),
  },
});
