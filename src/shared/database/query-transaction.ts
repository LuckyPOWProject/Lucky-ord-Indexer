import { TransactionWithBlock } from "../../types/dogecoin-interface";
import { BlockSaved } from "../../types/inscription-interface";
import SystemConfig from "../system/config";
import GetMongoConnection from "./connection-provider";

const QueryTransactions = {
  LoadTransactions: async (fromBlock: number, toBlock: number) => {
    try {
      const connection = await GetMongoConnection();
      const db = connection.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionTransaction);

      const Query = { blockNumber: { $gte: fromBlock, $lte: toBlock } };
      const data = await collection.find(Query).toArray();

      return data;
    } catch (error) {
      throw new Error("Faild to Load Transactions...");
    }
  },
  IndexTransactions: async (data: TransactionWithBlock[]) => {
    try {
      const connection = await GetMongoConnection();
      const db = connection.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionTransaction);

      const TotalDataInjected = await collection.insertMany(data);

      if (TotalDataInjected.insertedCount !== data.length) {
        throw new Error("Faild to insert some transaction data");
      }
    } catch (error) {
      throw new Error("Some error occoured");
    }
  },
  LoadSingleTransaction: async (txid: string) => {
    try {
      const connection = await GetMongoConnection();
      const db = connection.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionTransaction);

      const Query = { txid: txid };

      const data = await collection.findOne(Query);
      return data ? data : false;
    } catch (error) {
      return false;
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
      throw new Error("Faild to Load Transactions...");
    }
  },

  InsertBlocks: async (data: { block: string; number: number }[]) => {
    try {
      const connection = await GetMongoConnection();
      const db = connection.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionBlocks);

      const count = await collection.insertMany(data);

      if (count.insertedCount !== data.length) {
        throw new Error("Faild to insert some block hex");
      }
    } catch (error) {
      throw error;
    }
  },
  getBlock: async (height: number) => {
    try {
      const connection = await GetMongoConnection();
      const db = connection.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionBlocks);

      const count = await collection.findOne<BlockSaved>({
        number: height,
      });

      if (!count) return;
      return count;
    } catch (error) {
      throw error;
    }
  },
};

export default QueryTransactions;
