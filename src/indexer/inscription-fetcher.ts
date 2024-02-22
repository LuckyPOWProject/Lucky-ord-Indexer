import inscriptionQuery from "../shared/database/query-inscription";
import { TransactionWithBlock } from "../types/dogecoin-interface";
import {
  inscriptionIncomplete,
  inscriptionStoreModel,
} from "../types/inscription-interface";
import { OutputScriptToAddress } from "../utils/indexer-utlis";
import DecodeInputScript from "../utils/decode-input-script";

const inscriptionFetchandStore = async (
  data: TransactionWithBlock[]
): Promise<inscriptionStoreModel[]> => {
  try {
    const inscriptionInCompleteCache: Record<string, inscriptionIncomplete> =
      {};

    const inscriptionCache: Record<string, inscriptionStoreModel> = {};

    const inscriptionData: inscriptionStoreModel[] = [];

    let pendinginscriptions: inscriptionIncomplete[] = [];

    const LocationCache = new Set();

    for (const transactions of data) {
      const DecodedInputData = DecodeInputScript(transactions.inputs);

      if (!DecodedInputData.length) continue;

      const inscriptionOutput = transactions.outputs[0];

      const inscriptionMinter = OutputScriptToAddress(inscriptionOutput.script);

      const Location = `${transactions.txid}:${inscriptionOutput.index}`; //location is where inscription is stored

      for (const inscriptionInInputs of DecodedInputData) {
        const inscription_id = `${transactions.txid}i${inscriptionInInputs.index}`;

        const inscription_contentType = inscriptionInInputs.contentType;

        const inscription_data = inscriptionInInputs.data;

        if (
          inscriptionInInputs.IsremaingChunkPush &&
          inscriptionInInputs.previousHash
        ) {
          const IsremaingChunkPushSameBlock =
            inscriptionInCompleteCache[inscriptionInInputs.previousHash];

          let newDataHandler;
          let dataFromDB = false;

          if (
            !IsremaingChunkPushSameBlock ||
            !IsremaingChunkPushSameBlock.inscription.data
          ) {
            //Lets Check if they are in Database

            const isRemaininginDB =
              await inscriptionQuery.getPendingInscriptions(
                inscriptionInInputs.previousHash
              );

            if (!isRemaininginDB) continue;

            dataFromDB = true;
            newDataHandler = isRemaininginDB;
          } else {
            newDataHandler = IsremaingChunkPushSameBlock;
          }

          const newData = newDataHandler.inscription.data + inscription_data;

          if (dataFromDB) {
            await inscriptionQuery.DeletePendingInscriptions(
              inscriptionInInputs.previousHash
            );
          } else {
            delete inscriptionInCompleteCache[inscriptionInInputs.previousHash];

            pendinginscriptions = pendinginscriptions.filter(
              (a) => a.location !== inscriptionInInputs.previousHash
            );
          }

          if (!inscriptionInInputs.isComplete) {
            inscriptionInCompleteCache[Location] = {
              inscription: {
                contentType: newDataHandler.inscription.contentType,
                data: newData,
              },
              index: newDataHandler.index,
              block: newDataHandler.block,
              time: newDataHandler.time,
              txid: newDataHandler.txid,
              location: Location,
              id: newDataHandler.id,
            };
            pendinginscriptions.push(inscriptionInCompleteCache[Location]);
          } else {
            LocationCache.add(Location);

            inscriptionCache[Location] = {
              prehash: inscriptionInInputs.previousHash,
              inscription: {
                contentType: newDataHandler.inscription.contentType,
                data: newData,
              },
              inscriptionNumber: 0,
              index: newDataHandler.index,
              block: newDataHandler.block,
              time: newDataHandler.time,
              id: newDataHandler.id,
              location: Location,
              txid: newDataHandler.txid,
              owner: inscriptionMinter,
              minter: inscriptionMinter,
            };

            inscriptionData.push(inscriptionCache[Location]);
          }
          continue;
        }

        const inscriptionInCompleteCacheKey = Location;

        if (!inscriptionInInputs.isComplete) {
          inscriptionInCompleteCache[inscriptionInCompleteCacheKey] = {
            inscription: {
              data: inscription_data,
              contentType: inscription_contentType,
            },
            block: 0,
            index: transactions.index,
            time: transactions.time,
            location: Location,
            txid: transactions.txid,
            id: inscription_id,
          };
          pendinginscriptions.push(
            inscriptionInCompleteCache[inscriptionInCompleteCacheKey]
          );
          continue;
        }
        LocationCache.add(Location);
        inscriptionCache[Location] = {
          prehash: inscriptionInInputs?.previousHash,
          id: inscription_id,
          inscriptionNumber: 0,
          inscription: {
            contentType: inscription_contentType,
            data: inscription_data,
          },
          block: transactions.blockNumber,
          time: transactions.time,
          txid: transactions.txid,
          index: transactions.index,
          location: Location,
          owner: inscriptionMinter,
          minter: inscriptionMinter,
        };
        inscriptionData.push(inscriptionCache[Location]);
      }
    }

    const DBQuery = [];

    if (pendinginscriptions.length !== 0) {
      DBQuery.push(
        await inscriptionQuery.storePendingInscriptions(pendinginscriptions)
      );
    }

    await Promise.all(DBQuery);

    return inscriptionData;
  } catch (error) {
    throw error;
  }
};

export default inscriptionFetchandStore;
