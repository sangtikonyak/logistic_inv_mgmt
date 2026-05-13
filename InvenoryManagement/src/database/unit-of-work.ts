import { DatabaseTransaction } from './database.types';
import { TransactionManager } from './transaction-manager';

export class UnitOfWork {
  constructor(private readonly transactionManager: TransactionManager) {}

  async execute<T>(operation: (transaction: DatabaseTransaction) => Promise<T>): Promise<T> {
    const transaction = await this.transactionManager.begin();

    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      transaction.release();
    }
  }
}
