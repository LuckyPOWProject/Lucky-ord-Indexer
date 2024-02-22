import { LoctionUpdates } from "../../types/inscription-interface";
import {
  inscriptionIncomplete,
  inscriptionStoreModel,
} from "../../types/inscription-interface";
import { GetInscriptionUpdateQuery } from "../../utils/indexer-utlis";
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
  LoadMatchLoctionInscriptions: async (location: string[]) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionInscription);

      const Query = { location: { $in: location } };

      const data = await collection.find(Query).toArray();

      return data.length === 0 ? false : data;
    } catch (error) {
      throw error;
    }
  },

  UpdateInscriptionLocation: async (data: LoctionUpdates[]) => {
    try {
      const conn = await GetMongoConnection();
      const db = conn.db(SystemConfig.database);
      const collection = db.collection(SystemConfig.collectionInscription);

      const Query = GetInscriptionUpdateQuery(data);

      const updatesRes = (await collection.bulkWrite(Query)).modifiedCount;

      if (Query.length !== updatesRes) {
        throw new Error("Faild to update some inscriptions...");
      }
    } catch (error) {
      throw error;
    }
  },
};

export default inscriptionQuery;
