import inscriptionQuery from "../../shared/database/query-inscription";
import { TransactionWithBlock } from "../../types/dogecoin-interface";
import {
  InscriptionChunks,
  inscriptionIncomplete,
  inscriptionStoreModel,
} from "../../types/inscription-interface";
import { OutputScriptToAddress } from "../../utils/indexer-utlis";
import DecodeInputScript from "../../utils/decode-input-script";

interface inscriptionFetchout {
  pending: inscriptionIncomplete[];
  inscriptions: inscriptionStoreModel[];
  locations: Record<string, string>;
  InscriptionChunks: InscriptionChunks[];
}

const inscriptionFetchandStore = async (
  data: TransactionWithBlock[]
): Promise<inscriptionFetchout> => {
  try {
    const inscriptionInCompleteCache: Record<string, inscriptionIncomplete> =
      {};

    const inscriptionData: inscriptionStoreModel[] = [];
    const InscriptionChunks: InscriptionChunks[] = [];
    let pendinginscriptions: inscriptionIncomplete[] = [];

    /**
     * In Location tracker we will store his location history with
     * inscription id, Now in inscription-transfer-worker.ts we check
     * if any inscription was stored in this location sats, if they where
     * store then the inscription will be invalid and we won't store it
     */

    const LocationTracker: Record<string, string> = {};

    for (const transactions of data) {
      const DecodedInputData = DecodeInputScript(transactions.inputs);

      if (!DecodedInputData.length) continue;

      const inscriptionOutput = transactions.outputs[0];

      const inscriptionMinter = OutputScriptToAddress(inscriptionOutput.script);

      const Location = `${transactions.txid}:${inscriptionOutput.index}`;

      for (const inscriptionInInputs of DecodedInputData) {
        let inscription_id = `${transactions.txid}i${inscriptionInInputs.index}`;

        let inscription_contentType = inscriptionInInputs.contentType;

        let inscription_data = inscriptionInInputs.data;

        let txid = transactions.txid;

        let transactionIndex = transactions.index;

        let InscriptionComplete = inscriptionInInputs.isComplete;

        if (inscriptionInInputs.IsremaingChunkPush) {
          //Now lets get the prevous hash used
          if (!inscriptionInInputs.previousHash) continue;

          const PushinSameBatch =
            inscriptionInCompleteCache[inscriptionInInputs?.previousHash];

          let inscription_id_ = PushinSameBatch?.id;
          let inscription_contentType_ =
            PushinSameBatch?.inscription?.contentType;

          let inscription_data_ = PushinSameBatch?.inscription?.data;

          let txid_ = PushinSameBatch?.txid;

          let transactionIndex_ = PushinSameBatch?.index;

          if (!PushinSameBatch) {
            const pendingInscriptionFromDb =
              await inscriptionQuery.getPendingInscriptions(
                inscriptionInInputs.previousHash
              );

            if (!pendingInscriptionFromDb) continue;

            inscription_id_ = pendingInscriptionFromDb.id;
            inscription_contentType_ =
              pendingInscriptionFromDb.inscription.contentType;
            //inscription_data_ = pendingInscriptionFromDb.inscription.data;
            txid = pendingInscriptionFromDb.txid;
            transactionIndex_ = pendingInscriptionFromDb.index;

            await inscriptionQuery.DeletePendingInscriptions(
              inscriptionInInputs.previousHash
            );
          }

          delete inscriptionInCompleteCache[inscriptionInInputs.previousHash];

          inscription_id = inscription_id_;
          inscription_contentType = inscription_contentType_;

          //check if inscriptionchunks is added already

          const isChunkAdded = InscriptionChunks.find(
            (a) => a.id === inscription_id
          );

          if (isChunkAdded) {
            isChunkAdded.data = isChunkAdded.data + inscriptionInInputs.data;
          } else {
            InscriptionChunks.push({
              id: inscription_id,
              data: (inscription_data_ || "") + inscriptionInInputs.data,
            });
          }

          inscription_data = "chunks";
          txid = txid_;
          transactionIndex = transactionIndex_;
        }

        //we will track every location where the inscription was inscribed
        LocationTracker[`${Location}:${0}`] = inscription_id;

        if (!InscriptionComplete) {
          inscriptionInCompleteCache[Location] = {
            id: inscription_id,
            index: transactionIndex,
            location: Location,
            txid: txid,
            inscription: {
              contentType: inscription_contentType,
              data: inscription_data,
            },
          };

          const IsInscriptionAlreadyPending = pendinginscriptions.find(
            (a) => a.id === inscription_id
          );

          if (!IsInscriptionAlreadyPending) {
            pendinginscriptions.push(inscriptionInCompleteCache[Location]);
            continue;
          }

          IsInscriptionAlreadyPending.location = Location;
          IsInscriptionAlreadyPending.inscription.data = inscription_data;

          continue;
        }

        pendinginscriptions = pendinginscriptions.filter(
          (a) => a.id !== inscription_id
        );

        inscriptionData.push({
          id: inscription_id,
          index: transactions.index,
          location: Location,
          owner: inscriptionMinter,
          minter: inscriptionMinter,
          txid: transactions.txid,
          time: transactions.time,
          block: transactions.blockNumber,

          ...(DecodedInputData[0].delegation_txid
            ? { delegation_txid: DecodedInputData[0].delegation_txid }
            : {
                inscription: {
                  contentType: inscription_contentType,
                  data: inscription_data,
                },
              }),
          offset: 0,
        });
      }
    }
    return {
      locations: LocationTracker,
      pending: pendinginscriptions,
      inscriptions: inscriptionData,
      InscriptionChunks: InscriptionChunks,
    };
  } catch (error) {
    throw error;
  }
};

export default inscriptionFetchandStore;
