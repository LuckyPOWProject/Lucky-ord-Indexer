import inscriptionQuery from "../shared/database/query-inscription";
import { Block } from "../types/dogecoin-interface";
import {
  inscriptionIncomplete,
  inscriptionStoreModel,
} from "../types/inscription-interface";
import { OutputScriptToAddress } from "../utils/address-utlis";
import DecodeInputScript from "../utils/decode-input-script";

const inscriptionFetchandStore = async (
  data: Block,
  CurrentInscriptionNumber: number
): Promise<number> => {
  let inscriptionNumber = CurrentInscriptionNumber;

  try {
    const inscriptionInCompleteCache: Record<string, inscriptionIncomplete> =
      {};

    const inscriptionData: inscriptionStoreModel[] = [];

    let pendinginscriptions: inscriptionIncomplete[] = [];

    if (!data.transactions?.length) throw new Error("Transaction not found");

    for (const [i, blockData] of data.transactions?.entries()) {
      const DecodedInputData = DecodeInputScript(blockData.inputs);

      if (!DecodedInputData.length) continue;

      const inscriptionOutput = blockData.output[0];

      const inscriptionMinter = OutputScriptToAddress(inscriptionOutput.script);

      const Location = `${blockData.txid}:${inscriptionOutput.index}`; //location is where inscription is stored

      for (const inscriptionInInputs of DecodedInputData) {
        const inscription_id = `${blockData.txid}i${inscriptionInInputs.index}`;

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
            inscriptionNumber += 1;

            inscriptionData.push({
              inscription: {
                contentType:
                  IsremaingChunkPushSameBlock.inscription.contentType,
                data: newData,
              },
              inscriptionNumber: inscriptionNumber,
              index: IsremaingChunkPushSameBlock.index,
              block: IsremaingChunkPushSameBlock.block,
              time: IsremaingChunkPushSameBlock.time,
              id: IsremaingChunkPushSameBlock.id,
              location: Location,
              txid: IsremaingChunkPushSameBlock.txid,
              owner: inscriptionMinter,
              minter: inscriptionMinter,
            });
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
            index: i,
            time: data.blockheader?.blocktime || 0,
            location: Location,
            txid: blockData.txid,
            id: inscription_id,
          };
          pendinginscriptions.push(
            inscriptionInCompleteCache[inscriptionInCompleteCacheKey]
          );
          continue;
        }

        inscriptionNumber += 1;

        inscriptionData.push({
          id: inscription_id,
          inscriptionNumber: inscriptionNumber,
          inscription: {
            contentType: inscription_contentType,
            data: inscription_data,
          },
          block: data.blockheader?.blocktime || 0,
          time: data.blockheader?.blocktime || 0,
          txid: blockData.txid,
          index: i,
          location: Location,
          owner: inscriptionMinter,
          minter: inscriptionMinter,
        });
      }
    }

    const DBQuery = [];
    if (inscriptionData.length !== 0) {
      DBQuery.push(await inscriptionQuery.storeInscription(inscriptionData));
    }

    if (pendinginscriptions.length !== 0) {
      DBQuery.push(
        await inscriptionQuery.storePendingInscriptions(pendinginscriptions)
      );
    }

    await Promise.all(DBQuery);

    return inscriptionNumber;
  } catch (error) {
    throw error;
  }
};

export default inscriptionFetchandStore;
