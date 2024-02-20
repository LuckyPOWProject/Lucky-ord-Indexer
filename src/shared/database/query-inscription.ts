import {
  inscriptionIncomplete,
  inscriptionStoreModel,
} from "../../types/inscription-interface";
import SystemConfig from "../system/config";
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
};

export default inscriptionQuery;
