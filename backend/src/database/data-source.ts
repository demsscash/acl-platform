import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const isCompiled = path.extname(__filename) === '.js';
const entitiesPattern = isCompiled
  ? 'dist/src/database/entities/**/*.entity.js'
  : 'src/database/entities/**/*.entity.ts';
const migrationsPattern = isCompiled
  ? 'dist/src/database/migrations/**/*.js'
  : 'src/database/migrations/**/*.ts';

const baseOptions: DataSourceOptions = process.env.DATABASE_URL
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [entitiesPattern],
      migrations: [migrationsPattern],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  : {
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'acl_user',
      password: process.env.DATABASE_PASSWORD || 'acl_password',
      database: process.env.DATABASE_NAME || 'acl_db',
      entities: [entitiesPattern],
      migrations: [migrationsPattern],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    };

export const dataSourceOptions: DataSourceOptions = baseOptions;

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
