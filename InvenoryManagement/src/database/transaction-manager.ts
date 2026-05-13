import mysql from 'mysql2/promise';
import { DatabaseTransaction, QueryParams } from './database.types';

class MysqlTransaction implements DatabaseTransaction {
  constructor(private readonly connection: mysql.PoolConnection) {}

  execute<T extends mysql.RowDataPacket[] | mysql.ResultSetHeader>(
    sql: string,
    params?: QueryParams
  ): Promise<[T, mysql.FieldPacket[]]> {
    return this.connection.execute<T>(sql, params);
  }

  query<T extends mysql.RowDataPacket[] | mysql.ResultSetHeader>(
    sql: string,
    params?: QueryParams
  ): Promise<[T, mysql.FieldPacket[]]> {
    return this.connection.query<T>(sql, params);
  }

  async commit(): Promise<void> {
    await this.connection.commit();
  }

  async rollback(): Promise<void> {
    await this.connection.rollback();
  }

  release(): void {
    this.connection.release();
  }
}

export class TransactionManager {
  constructor(private readonly pool: mysql.Pool) {}

  async begin(): Promise<DatabaseTransaction> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return new MysqlTransaction(connection);
  }
}
