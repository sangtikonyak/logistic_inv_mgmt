import mysql from 'mysql2/promise';
import { env } from '../config/env';
import { DatabaseRow, Queryable, QueryParams } from './database.types';
import { TransactionManager } from './transaction-manager';
import { UnitOfWork } from './unit-of-work';

const dbConfig = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
};

declare global {
  var __dbPool: mysql.Pool | undefined;
}

// Create a connection pool globally to avoid exhausting connections during dev hot-reloads
export const pool = globalThis.__dbPool || mysql.createPool(dbConfig);

if (env.NODE_ENV !== 'production') {
  globalThis.__dbPool = pool;
}

class PoolQueryable implements Queryable {
  constructor(private readonly mysqlPool: mysql.Pool) {}

  execute<T extends DatabaseRow[] | mysql.ResultSetHeader>(
    sql: string,
    params?: QueryParams
  ): Promise<[T, mysql.FieldPacket[]]> {
    return this.mysqlPool.execute<T>(sql, params);
  }

  query<T extends DatabaseRow[] | mysql.ResultSetHeader>(
    sql: string,
    params?: QueryParams
  ): Promise<[T, mysql.FieldPacket[]]> {
    return this.mysqlPool.query<T>(sql, params);
  }
}

export const db = new PoolQueryable(pool);
export const transactionManager = new TransactionManager(pool);
export const unitOfWork = new UnitOfWork(transactionManager);

export async function query<T extends DatabaseRow[] | mysql.ResultSetHeader>(
  sql: string,
  params?: QueryParams
): Promise<T> {
  const [results] = await db.execute<T>(sql, params);
  return results as T;
}
