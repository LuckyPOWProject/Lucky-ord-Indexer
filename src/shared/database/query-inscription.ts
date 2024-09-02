import {
  InscriptionChunks,
  LoctionUpdates,
  inscriptionTransfer,
} from "../../types/inscription-interface";
import {
  inscriptionIncomplete,
  inscriptionStoreModel,
} from "../../types/inscription-interface";
import { GetInscriptionUpdateQuery, Sleep } from "../../utils/indexer-utlis";
import SystemConfig from "../system/config";
import Logger from "../system/logger";
import GetMongoConnection from "./connection-provider";

const inscriptionQuery = {
  storeInscription: async (data: inscriptionStoreModel[]) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionInscription);

      await collection.insertMany(data);
    } catch (error) {
      throw error;
    }
  },
  storePendingInscriptions: async (data: inscriptionIncomplete[]) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(
        SystemConfig.collectionPendingInscription
      );

      await collection.insertMany(data);
    } catch (error) {
      throw error;
    }
  },
  getPendingInscriptions: async (location: string) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(
        SystemConfig.collectionPendingInscription
      );

      const Query = { location: location };

      const data = await collection.findOne(Query);

      return data ? data : null;
    } catch (error) {
      throw error;
    }
  },
  DeletePendingInscriptions: async (location: string) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(
        SystemConfig.collectionPendingInscription
      );

      const Query = { location: location };

      await collection.deleteOne(Query);
    } catch (error) {
      throw error;
    }
  },
  LoadMatchLoctionInscriptions: async (location: string[]) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionInscription);

      const Query = { location: { $in: location } };

      const projection = { id: 1, location: 1, offset: 1, owner: 1 };

      const data = await collection
        .find(Query, { projection: projection })
        .toArray();

      return data.length === 0 ? false : data;
    } catch (error) {
      throw error;
    }
  },

  UpdateInscriptionLocation: async (data: LoctionUpdates[]): Promise<any> => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionInscription);

      const Query = GetInscriptionUpdateQuery(data);

      await collection.bulkWrite(Query);
    } catch (error) {
      Logger.error("Error updating inscription");
      await Sleep(10 * 60);
      return await inscriptionQuery.UpdateInscriptionLocation(data);
    }
  },

  deleteInscriptionChunks: async (id: string) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionChunks);

      await collection.deleteMany({ id: id });
    } catch (error) {
      throw error;
    }
  },

  storeInscriptionChunks: async (data: InscriptionChunks[]) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionChunks);

      await collection.insertMany(data);
    } catch (error) {
      throw error;
    }
  },
  storeInscriptionTransferHistory: async (data: inscriptionTransfer[]) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionHistory);
      await collection.insertMany(data);
    } catch (error) {
      throw error;
    }
  },
};

export default inscriptionQuery;
