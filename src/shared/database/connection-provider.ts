import { MongoClient } from "mongodb";
import SystemConfig from "../system/config";

const Client = new MongoClient(SystemConfig.mongAuth || "");

let PreClient: MongoClient;

const GetMongoConnection = async () => {
  try {
    if (!PreClient) {
      PreClient = await Client.connect();
      return PreClient;
    }
    return PreClient;
  } catch (error) {
    throw error;
  }
};

export default GetMongoConnection;
