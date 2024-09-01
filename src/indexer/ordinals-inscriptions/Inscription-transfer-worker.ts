import inscriptionQuery from "../../shared/database/query-inscription";
import QueryInscriptions from "../../shared/database/query-transaction";
import {
  TransactionWithBlock,
  coinbaseTrasactionMeta,
} from "../../types/dogecoin-interface";
import { inscriptionStoreModel } from "../../types/inscription-interface";
import {
  FetchMissingInputsValue,
  GetTransactionFeeSum,
  OutputScriptToAddress,
  ReverseHash,
} from "../../utils/indexer-utlis";
import { LoctionUpdates } from "../../types/inscription-interface";
import Logger from "../../shared/system/logger";
import DogecoinCLI from "../../api/dogecoin-core-rpc/node-connection";

const MAX_ARRAYCACHE = 80_000;

const BLOCK_REWARD = 10000 * 1e8;

const inscriptionTransferWork = async (
  data: inscriptionStoreModel[],
  blockData: TransactionWithBlock[],
  locationCache: Record<string, string>
) => {
  await DogecoinCLI.connect();
  try {
    let OutpuValueCache: Record<string, number> = {};

    const coinbaseTransactions: Record<number, coinbaseTrasactionMeta> = {};

    const MatchedLoctionCache: Record<string, string[]> = {};

    let BlockInscriptions = data;

    const InscriptionOnBlock = new Set(BlockInscriptions.map((e) => e.id));

    const InputIds: string[][] = [[]];

    const LoctionUpdateInscriptions: LoctionUpdates[] = [];

    const invalidInscriptions = new Set<string>();

    const LocationQue = new Set();

    const TransactionMap = new Map<number, TransactionWithBlock[]>();

    for (const transaction of blockData) {
      if (transaction.coinbase) {
        const location = `${transaction.txid}:${transaction.outputs[0].index}`;
        const address = `Miner`;
        coinbaseTransactions[transaction.blockNumber] = {
          address: address,
          location: location,
        };
        continue;
      }

      const blockNumber = transaction.blockNumber;

      if (!TransactionMap.has(blockNumber)) {
        TransactionMap.set(blockNumber, []);
      }
      const BlockHouse = TransactionMap.get(blockNumber);
      if (!BlockHouse) throw new Error("Block has not been init");
      BlockHouse.push(transaction);

      transaction.outputs.map((e) => {
        const key = `${transaction.txid}:${e.index}`;
        OutpuValueCache[key] = e.amount;
      });

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
      const Key = e.txid;
      e.outputs.map((a: { amount: number; index: number }) => {
        OutpuValueCache[`${Key}:${a.index}`] = a.amount;
      });
    });

    /**Now we get all important data that is required,
     * Now lets begin to track the Doginals Transfers
     *  with logic **/

    //lets track the time

    const StartTimerLogic = performance.now();

    Logger.Success(`Working in transfer logic...`);

    for (const [index, DoginalsTransfer] of blockData.entries()) {
      if (DoginalsTransfer.coinbase) continue;

      for (const [i, input] of DoginalsTransfer.inputs.entries()) {
        const key = ReverseHash(input.txid);

        const Inputkey = `${key}:${input.vin}`;

        const isInscriptionTransfer = MatchedLoctionCache[Inputkey];

        if (!isInscriptionTransfer) continue; // not a inscription transfer

        const InscriptionLogicInput = DoginalsTransfer.inputs.slice(0, i);

        const inputValues: number[] = [];

        const NON_EXIST_KEY: string[] = [];

        const NON_EXIST_TX: string[] = []; //the controller

        const NON_EXIST_CACHE = new Set(); //add to cache

        for (const inscriptionInputs of InscriptionLogicInput) {
          const inputTxid = ReverseHash(inscriptionInputs.txid);

          const KeySats = `${inputTxid}:${inscriptionInputs.vin}`;

          const InputSats = OutpuValueCache[KeySats];

          if (!InputSats) {
            NON_EXIST_KEY.push(KeySats);
            const IsInputOnList = NON_EXIST_CACHE.has(inputTxid);

            if (IsInputOnList) continue;
            NON_EXIST_TX.push(inputTxid);
            NON_EXIST_CACHE.add(inputTxid);
            continue;
          }

          inputValues.push(InputSats);
          continue;
        }

        /**
         *
         * Now lets fetch the transactions for the NONE found tx and alien them
         * with the input value
         */

        if (NON_EXIST_TX.length) {
          const InputsTransaction = await FetchMissingInputsValue(NON_EXIST_TX);

          //store the values to the cache
          InputsTransaction.map((e) => {
            e.output.outputs.map((outs) => {
              const KeyOutputValue = `${e.hash}:${outs.index}`;
              OutpuValueCache[KeyOutputValue] = outs?.amount;
            });
          });

          //now set the value
          NON_EXIST_KEY.map((e) => {
            if (OutpuValueCache[e]) inputValues.push(OutpuValueCache[e]);
            else throw new Error("Input value not found");
          });
        }

        if (inputValues.length !== InscriptionLogicInput.length)
          throw new Error("Input Value length and hash lenght missmatch");

        /**
         * Now we need to get all the inscription that matched with the location
         * and loop over it
         */

        const BlockCoinBase =
          coinbaseTransactions[DoginalsTransfer.blockNumber];

        const SumInputValues = inputValues.reduce((a, b) => a + b, 0);

        for (const inscriptions of isInscriptionTransfer) {
          const inscriptionData = inscriptions.split(":");
          const InscriptionId = inscriptionData[0];

          const offsetnum = Number(inscriptionData[1]);

          const inputSum = SumInputValues + offsetnum;

          let newInscriptionIndex;
          let CurrentOutputSum = 0;
          let offset = offsetnum;

          for (const [i, Outputs] of DoginalsTransfer.outputs.entries()) {
            const OutputValue = Outputs.amount;

            if (OutputValue + CurrentOutputSum > inputSum) {
              offset = inputSum - CurrentOutputSum;

              newInscriptionIndex = i;
              break;
            }

            CurrentOutputSum += OutputValue;
          }

          //ofset where inscription will be included

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

          if (newInscriptionIndex === undefined) {
            /** Lets get the last fee sum */
            const GetFeeSum = await GetTransactionFeeSum(
              OutpuValueCache,
              TransactionMap,
              DoginalsTransfer.index,
              DoginalsTransfer.blockNumber
            );

            offset =
              inputSum -
              CurrentOutputSum +
              BLOCK_REWARD +
              GetFeeSum.CurrentFeeSum;

            OutpuValueCache = GetFeeSum.inputsValue;
          }

          /**
           * Now we check if the location where the inscription was inscribed was
           * used in doginals transfer or not, if it was used then it will be
           * invalid doginals inscribe, because you can't inscribe same doginals
           * in same sats
           */

          const InscriptionOnLocation =
            locationCache[`${newlocation}:${offset}`];

          if (InscriptionOnLocation) {
            invalidInscriptions.add(InscriptionOnLocation);
          }

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

        delete MatchedLoctionCache[Inputkey];
      }
    }

    const EndTimerLogic = performance.now();

    const TimerTook = (EndTimerLogic - StartTimerLogic) / 1000;

    Logger.Success(`Took ${TimerTook} to complete transfer logic...`);

    if (LoctionUpdateInscriptions.length) {
      Logger.Success(
        `Updating, ${LoctionUpdateInscriptions.length} Location for inscriptions...`
      );
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
