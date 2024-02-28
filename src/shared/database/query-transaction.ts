import { TransactionWithBlock } from "../../types/dogecoin-interface";
import SystemConfig from "../system/config";
import GetMongoConnection from "./connection-provider";

const QueryInscriptions = {
  LoadTransactions: async (fromBlock: number, toBlock: number) => {
    try {
      const connection = await GetMongoConnection();
      const db = connection.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionTransaction);

      const Query = { blockNumber: { $gte: fromBlock, $lte: toBlock } };
      const data = await collection.find(Query).toArray();

      return data;
    } catch (error) {
      throw error;
    }
  },
  IndexTransactions: async (data: TransactionWithBlock[]) => {
    try {
      const connection = await GetMongoConnection();
      const db = connection.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionTransaction);

      await collection.insertMany(data);
    } catch (error) {
      throw error;
    }
  },

  LoadTransactionMatchedWithInput: async (hash: string[]) => {
    try {
      const connection = await GetMongoConnection();
      const db = connection.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionTransaction);

      const Query = { txid: { $in: hash } };

      const data = await collection.find(Query).toArray();
      return data;
    } catch (error) {
      throw error;
    }
  },
};

export default QueryInscriptions;
