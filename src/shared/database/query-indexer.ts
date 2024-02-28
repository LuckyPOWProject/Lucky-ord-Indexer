import { indexingStatus } from "../../types/dogecoin-interface";
import SystemConfig from "../system/config";
import GetMongoConnection from "./connection-provider";
import dogecoinCli from "./../../api/dogecoin-core-rpc/node-connection";
const IndexerQuery = {
  initIndexer: async () => {
    await dogecoinCli.connect();
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionIndexer);

      const data = {
        id_index: "index",
        LastInscriptionIndexedBlock: Number(SystemConfig.startIndex),
        LatestBlock: await dogecoinCli.getLastsynedBlock(),
        LastTransactionIndexedBlock: Number(SystemConfig.startIndex),
        TotalBlockIndex: 0,
      };

      await collection.insertOne(data);
    } catch (error) {
      throw error;
    }
  },
  LoadIndexerStatus: async (): Promise<indexingStatus> => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionIndexer);
      const data = await collection.find({}).toArray();

      if (!data.length) {
        await IndexerQuery.initIndexer();

        return {
          LastInscriptionIndexedBlock: 0,
          LatestBlock: 0,
          LastTransactionIndexedBlock: 0,
          TotalBlockIndex: 0,
        };
      }

      return {
        LastInscriptionIndexedBlock: data[0].LastInscriptionIndexedBlock,
        LatestBlock: data[0].LatestBlock,
        LastTransactionIndexedBlock: data[0].LastTransactionIndexedBlock,
        TotalBlockIndex: data[0].TotalBlockIndex,
      };
    } catch (error) {
      throw error;
    }
  },
  UpdateTotalBlockIndex: async (count: number) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionIndexer);
      await collection.updateOne(
        { id_index: "index" },
        { $set: { TotalBlockIndex: count } }
      );
    } catch (error) {
      throw error;
    }
  },
  UpdateLastInscriptionIndexedBlock: async (num: number) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionIndexer);
      await collection.updateOne(
        { id_index: "index" },
        { $set: { LastInscriptionIndexedBlock: num } }
      );
    } catch (error) {
      throw error;
    }
  },
  UpdateLastTransactionIndexedBlock: async (num: number) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionIndexer);
      await collection.updateOne(
        { id_index: "index" },
        { $set: { LastTransactionIndexedBlock: num } }
      );
    } catch (error) {
      throw error;
    }
  },
};

export default IndexerQuery;
