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
        NextInscriptionNumber: 0,
      };

      await collection.insertOne(data);

      return data;
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
        const defaultdata = await IndexerQuery.initIndexer();

        return defaultdata;
      }

      return {
        LastInscriptionIndexedBlock: data[0].LastInscriptionIndexedBlock,
        LatestBlock: data[0].LatestBlock,
        LastTransactionIndexedBlock: data[0].LastTransactionIndexedBlock,
        NextInscriptionNumber: data[0].NextInscriptionNumber,
      };
    } catch (error) {
      throw error;
    }
  },
  UpdateNextInscriptionNumber: async (NextInscriptionNumber: number) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionIndexer);
      await collection.updateOne(
        { id_index: "index" },
        { $set: { NextInscriptionNumber: NextInscriptionNumber } }
      );
    } catch (error) {
      throw error;
    }
  },
  UpdateLastBlock: async (count: number) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionIndexer);
      await collection.updateOne(
        { id_index: "index" },
        { $set: { LatestBlock: count } }
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
