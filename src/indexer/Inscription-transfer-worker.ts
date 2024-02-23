import inscriptionQuery from "../shared/database/query-inscription";
import QueryInscriptions from "../shared/database/query-transaction";
import {
  TransactionWithBlock,
  coinbaseTrasactionMeta,
} from "../types/dogecoin-interface";
import { inscriptionStoreModel } from "../types/inscription-interface";
import Decoder, {
  OutputScriptToAddress,
  ReverseHash,
} from "../utils/indexer-utlis";
import { LoctionUpdates } from "../types/inscription-interface";
import DogecoinCore from "../api/dogecoin-core-rpc";
import SystemConfig from "../shared/system/config";

const OutpuValueCache: Record<string, number> = {};

const coinbaseTransactions: Record<number, coinbaseTrasactionMeta> = {};

const inscriptionTransferWork = async (
  data: inscriptionStoreModel[],
  blockData: TransactionWithBlock[]
) => {
  const DogecoinCLI = new DogecoinCore({
    username: SystemConfig.user,
    password: SystemConfig.password,
    host: SystemConfig.host,
    port: SystemConfig.port,
  });

  await DogecoinCLI.connect();
  try {
    const MatchedLoctionCache: Record<string, string> = {};

    const BlockInscriptions = data;

    const BlockInscriptionsSet = new Set(BlockInscriptions.map((e) => e.id));

    const InputIds: string[] = [];

    const LoctionUpdateInscriptions: LoctionUpdates[] = [];

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

      transaction.inputs.map((e) => {
        const key = `${ReverseHash(e.txid)}:${e.vin}`;
        InputIds.push(key);
      });
    }

    //Now lets Get the List of Inscription that location = prehash

    const MatchedInscriptionLocation =
      await inscriptionQuery.LoadMatchLoctionInscriptions(InputIds);

    if (!MatchedInscriptionLocation)
      return {
        BlockInscriptions: BlockInscriptions,
      };

    BlockInscriptions.map((e) => {
      if (!e.location || !e.id) return;
      MatchedLoctionCache[e.location] = e.id;
    });

    MatchedInscriptionLocation.map((e) => {
      MatchedLoctionCache[e.location] = e.id;
    });

    const InputsHash: string[] = [];

    for (const transaction of blockData) {
      if (transaction.coinbase) continue;

      for (const txinputs of transaction.inputs) {
        const key = `${ReverseHash(txinputs.txid)}:${txinputs.vin}`;
        const MatchedInscriptionLocations = MatchedLoctionCache[key];
        if (!MatchedInscriptionLocations) continue;
        const Inputhash = transaction.inputs.map((e) => ReverseHash(e.txid));
        InputsHash.push(...Inputhash);
      }
    }

    //Load the transaction data of matched Inputs

    const TransactionOfInputs =
      await QueryInscriptions.LoadTransactionMatchedWithInput(InputsHash);

    const InputTransactionSet: Record<string, TransactionWithBlock> = {};

    TransactionOfInputs.map((e) => {
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
     * Now lets begin to track the Doginals Transfers with logic **/

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
          const TransactionFromNode = await DogecoinCLI.GetTransaction(
            ReverseHash(key)
          );

          if (!TransactionFromNode)
            throw new Error("Faild to get transaction from node...");

          const DecodeValues = Decoder(TransactionFromNode);

          TransactionHandler = DecodeValues;
        } else {
          TransactionHandler = IsValueInCache;
        }

        TransactionHandler.outputs.find((e) => {
          const KeyOutputValue = `${key}:${e?.index}`;
          OutpuValueCache[KeyOutputValue] = e?.amount;
        });

        const InscriptionLogicInput = DoginalsTransfer.inputs.slice(0, i);

        const inputValues: number[] = [];

        for (const inscriptionInputs of InscriptionLogicInput) {
          const inputTxid = ReverseHash(inscriptionInputs.txid);
          const KeySats = `${inputTxid}:${inscriptionInputs.vin}`;

          let InputSats = OutpuValueCache[KeySats];

          if (!InputSats) {
            // Now lets get Value

            let IsTxinSameSet = InputTransactionSet[inputTxid];

            if (!IsTxinSameSet) {
              const TransactionFromNode = await DogecoinCLI.GetTransaction(
                inputTxid
              );
              IsTxinSameSet = TransactionFromNode;
            }

            if (!IsTxinSameSet) {
              throw new Error("Faild to get input tx data");
            }

            IsTxinSameSet.outputs.map((e) => {
              const KeyOutputValue = `${inputTxid}:${e?.index}`;
              OutpuValueCache[KeyOutputValue] = e?.amount;
            });

            InputSats = OutpuValueCache[KeySats];
          }

          if (!InputSats) throw new Error("Faild to get input sats");

          inputValues.push(InputSats);
        }

        const SumInputValues = inputValues.reduce((a, b) => a + b, 0) + 1;

        let newInscriptionIndex;
        let CurrentOutputSum = 0;

        for (const [i, Outputs] of DoginalsTransfer.outputs.entries()) {
          const OutputValue = Outputs.amount;
          if (OutputValue + CurrentOutputSum > SumInputValues) {
            newInscriptionIndex = i;
            break;
          }
          CurrentOutputSum += OutputValue;
        }

        const Inscription = isInscriptionTransfer;
        const prehash = Inputkey;

        const BlockCoinBase =
          coinbaseTransactions[DoginalsTransfer.blockNumber];

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

        console.log(
          `New Location Update:- ${newlocation},, Inscription:- ${Inscription}`
        );

        MatchedLoctionCache[newlocation] = MatchedLoctionCache[Inputkey];
        delete MatchedLoctionCache[Inputkey];

        const isTransactioninCache = InputTransactionSet[DoginalsTransfer.txid];

        if (!isTransactioninCache) {
          InputTransactionSet[DoginalsTransfer.txid] = DoginalsTransfer;
        }

        const IsInscriptionInStoreQue = BlockInscriptionsSet.has(Inscription);

        if (IsInscriptionInStoreQue) {
          const InscriptionQue = BlockInscriptions.find(
            (a) => a.id === Inscription && a.prehash === prehash
          );

          if (!InscriptionQue) continue;

          InscriptionQue.location = newlocation;
          InscriptionQue.owner = newowner;
          continue;
        }

        const isInscriptionRepeat = LoctionUpdateInscriptions.find(
          (a) => a.inscriptionid === Inscription
        );

        if (isInscriptionRepeat) {
          isInscriptionRepeat.location = newlocation;
          isInscriptionRepeat.owner = newowner;
        }

        LoctionUpdateInscriptions.push({
          location: newlocation,
          owner: newowner,
          inscriptionid: Inscription,
          prelocation: prehash,
        });
      }
    }

    await inscriptionQuery.UpdateInscriptionLocation(LoctionUpdateInscriptions); // update the inscriptions location

    return {
      BlockInscriptions: BlockInscriptions,
    };
  } catch (error) {
    throw error;
  }
};

export default inscriptionTransferWork;
