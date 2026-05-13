import mysql from 'mysql2/promise';

export type QueryValue =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | Buffer
  | Uint8Array
  | QueryValue[]
  | { [key: string]: QueryValue };

export type QueryParams = QueryValue[];
export type DatabaseRow = mysql.RowDataPacket;

export interface Queryable {
  execute<T extends DatabaseRow[] | mysql.ResultSetHeader>(
    sql: string,
    params?: QueryParams
  ): Promise<[T, mysql.FieldPacket[]]>;

  query<T extends DatabaseRow[] | mysql.ResultSetHeader>(
    sql: string,
    params?: QueryParams
  ): Promise<[T, mysql.FieldPacket[]]>;
}

export interface DatabaseTransaction extends Queryable {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}
