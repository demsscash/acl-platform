import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const baseOptions: DataSourceOptions = process.env.DATABASE_URL
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: ['src/database/entities/**/*.entity.ts'],
      migrations: ['src/database/migrations/**/*.ts'],
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
      entities: ['src/database/entities/**/*.entity.ts'],
      migrations: ['src/database/migrations/**/*.ts'],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    };

export const dataSourceOptions: DataSourceOptions = baseOptions;

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
