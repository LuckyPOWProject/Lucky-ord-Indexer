import SystemConfig from "../system/config";
import GetMongoConnection from "./connection-provider";

const GetDBTemplate = async () => {
  const connection = await GetMongoConnection();
  const db = connection.db(SystemConfig.database);
  const collection = db.collection(SystemConfig.collectionHistory);
  return collection;
};

const QueryHTTPHistory = {
  getInscriptionHistory: async (id: string, limit: number, offset: number) => {
    try {
      const db = await GetDBTemplate();
      const data = await db
        .find({ inscription_id: id })
        .sort({ time: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      if (!data.length) return false;
      return data;
    } catch (error) {
      return false;
    }
  },
};

export default QueryHTTPHistory;
