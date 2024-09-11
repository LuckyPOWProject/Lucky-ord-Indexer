import { DataTypes } from "../../types/http-type";
import SystemConfig from "../system/config";
import GetMongoConnection from "./connection-provider";
import IndexerQuery from "./query-indexer";

const GetDBTemplate = async () => {
  const connection = await GetMongoConnection();
  const db = connection.db(SystemConfig.database);
  const collection = db.collection(SystemConfig.collectionInscription);
  return collection;
};

const getChunkTemplate = async () => {
  const connection = await GetMongoConnection();
  const db = connection.db(SystemConfig.database);
  const collection = db.collection(SystemConfig.collectionChunks);
  return collection;
};

const InscriptionhttpQuery = {
  countInscription: async (contentType?: string | string[]) => {
    const DB = await GetDBTemplate();

    let total = 0;

    if (contentType) {
      const contentTypetotal = await DB.countDocuments({
        "inscription.contentType":
          typeof contentType !== "string" ? { $in: contentType } : contentType,
      });
      total = contentTypetotal;
    } else {
      const indexerStatus = await IndexerQuery.LoadIndexerStatus();
      total = indexerStatus.NextInscriptionNumber - 1;
    }

    return total;
  },
  getInscriptions: async (
    limit: number,
    offset: number,
    contentType?: string | string[]
  ) => {
    try {
      const DB = await GetDBTemplate();

      const Data = await DB.find(
        !contentType
          ? {}
          : {
              "inscription.contentType":
                typeof contentType !== "string"
                  ? { $in: contentType }
                  : contentType,
            }
      )
        .sort({ inscriptionNumber: -1 })
        .limit(limit)
        .skip(offset)
        .toArray();

      return Data.length ? Data : false;
    } catch (error) {
      console.log(error);
      return false;
    }
  },

  getInscription: async (id: string, key: DataTypes) => {
    try {
      const DB = await GetDBTemplate();
      const Query = {
        [key]: key === DataTypes.inscriptionNumber ? Number(id) : id,
      };
      const data = await DB.findOne(Query);

      return data ? data : false;
    } catch (error) {
      return false;
    }
  },

  getChunksContent: async (id: string) => {
    try {
      const DB = await getChunkTemplate();

      const data = await DB.find({ id: id }).sort({ _id: 1 }).toArray();

      if (!data.length) return;
      return data;
    } catch (error) {}
  },

  getInscriptionsForKey: async (
    address: string,
    key: DataTypes,
    limit: number,
    offset: number
  ) => {
    try {
      const DB = await GetDBTemplate();

      const Query = [
        { $match: { [key]: address } },
        {
          $facet: {
            Data: [
              { $match: { [key]: address } },
              { $skip: offset },
              { $limit: limit },
            ],
            DataCount: [{ $group: { _id: `$${key}`, count: { $sum: 1 } } }],
          },
        },
      ];

      const Data = await DB.aggregate(Query).toArray();
      return Data.length && Data[0].Data.length ? Data : false;
    } catch (error) {
      console.log(error);
      return false;
    }
  },
};

export default InscriptionhttpQuery;
