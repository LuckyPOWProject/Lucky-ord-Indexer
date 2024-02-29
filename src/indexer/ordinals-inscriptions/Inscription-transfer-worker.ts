import inscriptionQuery from "../../shared/database/query-inscription";
import QueryInscriptions from "../../shared/database/query-transaction";
import {
  TransactionWithBlock,
  coinbaseTrasactionMeta,
} from "../../types/dogecoin-interface";
import { inscriptionStoreModel } from "../../types/inscription-interface";
import Decoder, {
  FetchMissingInputsValue,
  OutputScriptToAddress,
  ReverseHash,
} from "../../utils/indexer-utlis";
import { LoctionUpdates } from "../../types/inscription-interface";
import DogecoinCore from "../../api/dogecoin-core-rpc";
import SystemConfig from "../../shared/system/config";
import Logger from "../../shared/system/logger";

const OutpuValueCache: Record<string, number> = {};
const MAX_ARRAYCACHE = 80_000;

const coinbaseTransactions: Record<number, coinbaseTrasactionMeta> = {};

const inscriptionTransferWork = async (
  data: inscriptionStoreModel[],
  blockData: TransactionWithBlock[],
  locationCache: Record<string, string>
) => {
  const DogecoinCLI = new DogecoinCore({
    username: SystemConfig.user,
    password: SystemConfig.password,
    host: SystemConfig.host,
    port: SystemConfig.port,
  });

  await DogecoinCLI.connect();
  try {
    const MatchedLoctionCache: Record<string, string[]> = {};

    let BlockInscriptions = data;

    const InscriptionOnBlock = new Set(BlockInscriptions.map((e) => e.id));

    const InputIds: string[][] = [[]];

    const LoctionUpdateInscriptions: LoctionUpdates[] = [];

    const InputTransactionSet: Record<string, TransactionWithBlock> = {};

    const invalidInscriptions = new Set<string>();

    const LocationQue = new Set();

    for (const transaction of blockData) {
      //We store the coinbase block, because if the inscription is burned then it goes to miner
      if (transaction.coinbase) {
        const location = `${transaction.txid}:${transaction.outputs[0].index}`;
        const address = `Miner`;
        coinbaseTransactions[transaction.blockNumber] = {
          address: address,
          location: location,
        };
        continue;
      }

      InputTransactionSet[transaction.txid] = transaction;

      transaction.inputs.map((e) => {
        const key = `${ReverseHash(e.txid)}:${e.vin}`;
        if (InputIds[InputIds.length - 1].length <= MAX_ARRAYCACHE) {
          InputIds[InputIds.length - 1].push(key);
        } else {
          InputIds.push([key]);
        }
      });
    }

    //Now lets Get the List of Inscription that location = prehash
    const MatchedInscriptionLocation = await Promise.all(
      InputIds.map(async (e) => {
        const Inscriptions =
          (await inscriptionQuery.LoadMatchLoctionInscriptions(e)) || [];
        return Inscriptions?.map(
          (e): { inscription: string; location: string; offset: number } => {
            return {
              inscription: e.id,
              location: e.location,
              offset: e.offset,
            };
          }
        );
      })
    );

    const Inscription = MatchedInscriptionLocation.flat(1).concat(
      BlockInscriptions.map(
        (e): { inscription: string; location: string; offset: number } => {
          return {
            inscription: e?.id || "",
            location: e.location,
            offset: e.offset,
          };
        }
      )
    );

    Inscription.map((e) => {
      if (!e.location || !e.inscription) return;

      const IsExist = MatchedLoctionCache[e.location];
      if (!IsExist) {
        MatchedLoctionCache[e.location] = [`${e.inscription}:${e.offset}`];
      } else {
        MatchedLoctionCache[e.location].push(`${e.inscription}:${e.offset}`);
      }
    });

    //Load the transaction data of matched Inputs

    const InputHash = Array.from(
      new Set(InputIds.map((e) => e.map((hash) => hash.split(":")[0])))
    );

    const StartTimer = performance.now();

    const TransactionOfInputs = await Promise.all(
      InputHash.map(async (e) => {
        return await QueryInscriptions.LoadTransactionMatchedWithInput(e);
      })
    );

    const EndTimer = performance.now();

    const TimeTook = (EndTimer - StartTimer) / 1000;

    Logger.Success(
      `Took ${TimeTook} sec to fetch ${
        TransactionOfInputs.flat(1).length
      } Transactions...`
    );

    TransactionOfInputs.flat(1).map((e) => {
      console.log(e.txid);

      const Key = e.txid;
      InputTransactionSet[Key] = {
        index: e.index,
        inputs: e.inputs,
        outputs: e.outputs,
        time: e.time,
        txid: e.txid,
        coinbase: e.coinbase,
        blockNumber: e.blockNumber,
      };
    });

    /**Now we get all important data that is required,
     * Now lets begin to track the Doginals Transfers
     *  with logic **/

    for (const DoginalsTransfer of blockData) {
      if (DoginalsTransfer.coinbase) continue;

      for (const [i, input] of DoginalsTransfer.inputs.entries()) {
        const key = ReverseHash(input.txid);

        const Inputkey = `${key}:${input.vin}`;

        const isInscriptionTransfer = MatchedLoctionCache[Inputkey];

        if (!isInscriptionTransfer) continue; // not a inscription transfer

        const IsValueInCache = InputTransactionSet[key];

        let TransactionHandler;

        if (!IsValueInCache) {
          const TransactionFromNode = await DogecoinCLI.GetTransaction(key);

          if (!TransactionFromNode)
            throw new Error("Faild to get transaction from node...");

          const DecodeValues = Decoder(TransactionFromNode);

          TransactionHandler = DecodeValues;
        } else {
          TransactionHandler = IsValueInCache;
        }

        TransactionHandler.outputs.map((e) => {
          const KeyOutputValue = `${key}:${e?.index}`;
          OutpuValueCache[KeyOutputValue] = e?.amount;
        });

        const InscriptionLogicInput = DoginalsTransfer.inputs.slice(0, i);

        const inputValues: number[] = [];

        const NON_EXIST_TX = [];

        const NON_EXIST_CACHE = new Set();

        const NON_EXIST_KEY = [];

        for (const inscriptionInputs of InscriptionLogicInput) {
          const inputTxid = ReverseHash(inscriptionInputs.txid);

          const KeySats = `${inputTxid}:${inscriptionInputs.vin}`;

          const InputSats = OutpuValueCache[KeySats];

          if (InputSats) {
            inputValues.push(InputSats);
            continue;
          }

          NON_EXIST_KEY.push(KeySats);

          if (!NON_EXIST_CACHE.has(inputTxid)) {
            NON_EXIST_CACHE.add(inputTxid);
            NON_EXIST_TX.push(inputTxid);
          }
        }

        /**
         *
         * Now lets fetch the transactions for the NONE found tx and alien them
         * with the input value
         */

        const InputsTransaction = await FetchMissingInputsValue(NON_EXIST_TX);

        InputsTransaction.map((e) => {
          e.output.outputs.map((outs) => {
            const KeyOutputValue = `${e.hash}:${outs.index}`;
            OutpuValueCache[KeyOutputValue] = outs?.amount;
          });
        });

        NON_EXIST_KEY.map((e) => {
          if (OutpuValueCache[e]) inputValues.push(OutpuValueCache[e]);
        });

        if (inputValues.length !== InscriptionLogicInput.length)
          throw new Error("Input Value length and hash lenght missmatch");

        /**
         * Now we need to get all the inscription that matched with the location
         * and loop over it
         */

        const BlockCoinBase =
          coinbaseTransactions[DoginalsTransfer.blockNumber];

        for (const inscriptions of isInscriptionTransfer) {
          const inscriptionData = inscriptions.split(":");
          const InscriptionId = inscriptionData[0];
          const offsetnum = Number(inscriptionData[1]);

          const SumInputValues =
            inputValues.reduce((a, b) => a + b, 0) + offsetnum;

          let newInscriptionIndex;
          let CurrentOutputSum = 0;
          let offset = 0;

          for (const [i, Outputs] of DoginalsTransfer.outputs.entries()) {
            const OutputValue = Outputs.amount;

            if (OutputValue + CurrentOutputSum > SumInputValues) {
              newInscriptionIndex = i;
              offset = SumInputValues - CurrentOutputSum;
              break;
            }

            CurrentOutputSum += OutputValue;
          }

          let newlocation = BlockCoinBase.location;
          let newowner = BlockCoinBase.address;

          if (newInscriptionIndex !== undefined) {
            const newLoctionOutput =
              DoginalsTransfer.outputs[newInscriptionIndex];

            const newLocation = `${DoginalsTransfer.txid}:${newLoctionOutput.index}`;

            const newOwner = OutputScriptToAddress(newLoctionOutput.script);

            newlocation = newLocation;
            newowner = newOwner;
          }

          /**
           * Now we check if the location where the inscription was inscribed was
           * used in doginals transfer or not, if it was used then it will be
           * invalid doginals inscribe, because you can't inscribe same doginals
           * in same sats
           */

          const InscriptionOnLocation = locationCache[newlocation];

          if (InscriptionOnLocation) {
            invalidInscriptions.add(InscriptionOnLocation);
          }

          /***
           *
           * As we get now the new location for inscription, now we can update in
           * match location cache that there is location for particular inscription,
           * now we can delete the match location cache of previous match inscription input
           * key and add new location cache with new location
           */

          MatchedLoctionCache[Inputkey] = isInscriptionTransfer.filter(
            (a) => a !== inscriptions
          ); //delete the inscr... from that location

          /***
           * If there is no inscription left in that particular location key
           * the we need to delete the record
           */

          if (MatchedLoctionCache[Inputkey].length === 0)
            delete MatchedLoctionCache[Inputkey];

          /***
           *
           * Now the inscription is moved to new location right, we need add new
           * record in our cache to keep in track of inscription transfer, first
           * check if the new location is recored in cache or not,
           */

          const isLocationInCache = MatchedLoctionCache[newlocation];

          if (isLocationInCache) {
            /**
             * If the location is already recorded then just push
             * the inscriptionid and offset
             */

            isLocationInCache.push(`${InscriptionId}:${offset}`);
          } else {
            /**
             * If the location is not already recorded then record
             * the new data in cache
             */
            MatchedLoctionCache[newlocation] = [`${InscriptionId}:${offset}`];
          }

          /*****
           *
           * Now we can store the currect transaction to get input values in
           * futer transaction featching, so we don't need to get it from node
           */

          const isTransactionInCache =
            InputTransactionSet[DoginalsTransfer.txid];

          if (!isTransactionInCache) {
            InputTransactionSet[DoginalsTransfer.txid] = DoginalsTransfer;
          }

          /****
           * First we check if the inscription that was just inscribed
           * was transferd in same block, If it transfer then we just update
           * it location, offset, owner within the inscription array so we
           * don't need to run the update query for it
           */

          const IsInscribedInSameBlock = InscriptionOnBlock.has(InscriptionId);

          if (IsInscribedInSameBlock) {
            /**
             * Now we need to search the inscription from the data array and
             * just update the location, offset and new owner field
             */

            const InscriptionInBlock = BlockInscriptions.find(
              (a) => a.id === InscriptionId
            );

            /***
             *
             * If the inscription is not found in array we throw the error because
             * there might be bugs in our code...
             */

            if (!InscriptionInBlock) continue;
            /**
             * If the inscribed location sats already has inscription
             * transafered then its invalid inscription
             *
             */

            /***
             *
             * if inscription is found in the array we update the field wit our
             * new updated data
             */

            InscriptionInBlock.location = newlocation;
            InscriptionInBlock.offset = offset;
            InscriptionInBlock.owner = newowner;

            continue;
          }

          /***
           * Now we need to check if the inscription is already ready to
           * be updated in LocationUpdateInscription array, if there is
           * inscription then we just update its locatio, offset, owner state
           * with new value
           */

          const IsOnQue = LocationQue.has(InscriptionId);

          if (IsOnQue) {
            const isLocationUpdateQue = LoctionUpdateInscriptions.find(
              (a) => a.inscriptionid === InscriptionId
            );

            if (!isLocationUpdateQue)
              throw new Error("Inscription not found in que..");
            /***
             *
             * If inscription is on location update que just update the
             * array fields...
             */

            isLocationUpdateQue.location = newlocation;
            isLocationUpdateQue.offset = offset;
            isLocationUpdateQue.owner = newowner;
            continue;
          }

          /***
           *
           * If inscription is not on location update que just
           * push new inscription location update que
           */

          LocationQue.add(InscriptionId);

          LoctionUpdateInscriptions.push({
            inscriptionid: InscriptionId,
            location: newlocation,
            offset: offset,
            prelocation: Inputkey,
            owner: newowner,
          });
        }
      }
    }

    if (LoctionUpdateInscriptions.length) {
      await inscriptionQuery.UpdateInscriptionLocation(
        LoctionUpdateInscriptions
      );
    }

    return {
      BlockInscriptions: BlockInscriptions,
      invalidInscriptionsIds: invalidInscriptions,
    };
  } catch (error) {
    throw error;
  }
};

export default inscriptionTransferWork;
