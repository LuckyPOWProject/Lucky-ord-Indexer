import inscriptionQuery from "../shared/database/query-inscription";
import QueryInscriptions from "../shared/database/query-transaction";
import {
  TransactionWithBlock,
  TransactionWithPreId,
  coinbaseTrasactionMeta,
} from "../types/dogecoin-interface";
import { inscriptionStoreModel } from "../types/inscription-interface";
import { OutputScriptToAddress, ReverseHash } from "../utils/indexer-utlis";
import { LoctionUpdates } from "../types/inscription-interface";
const OutpuValueCache: Record<string, number> = {};
const coinbaseTransactions: Record<number, coinbaseTrasactionMeta> = {};

const inscriptionTransferWork = async (
  data: inscriptionStoreModel[],
  blockData: TransactionWithBlock[]
) => {
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

    const ValidDoginalsTransfer_Transaction: TransactionWithPreId[] = [];

    const InputsHash: string[] = [];

    for (const transaction of blockData) {
      if (transaction.coinbase) continue;

      transaction.inputs.map((e) => {
        const key = `${ReverseHash(e.txid)}:${e.vin}`;
        const MatchedInscriptionLocations = MatchedLoctionCache[key];

        if (!MatchedInscriptionLocations) return;

        ValidDoginalsTransfer_Transaction.push({
          transaction: transaction,
          inscriptionInputIndex: e.index,
          prehash: key,
          inscriptionId: MatchedInscriptionLocations,
        });

        const Inputhash = transaction.inputs.map(
          (e) => `${ReverseHash(e.txid)}:${e.vin}`
        );

        InputsHash.push(...Inputhash);
      });
    }

    const TransactionsHashFromInputHash = InputsHash.map(
      (e) => e.split(":")[0]
    );

    //Load the transaction data of matched Inputs

    const TransactionOfInputs =
      await QueryInscriptions.LoadTransactionMatchedWithInput(
        TransactionsHashFromInputHash
      );

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

    for (const DoginalsTransfer of ValidDoginalsTransfer_Transaction) {
      for (const input of DoginalsTransfer.transaction.inputs) {
        const key = `${ReverseHash(input.txid)}`;

        const IsValueInCache = InputTransactionSet[key];

        if (!IsValueInCache) throw new Error("Valid Not present in Cache");

        const inputValue = IsValueInCache.outputs.find((e) => {
          if (e.index === input.index) {
            return e.amount;
          }
        });

        if (!inputValue)
          throw new Error(
            `Input Value Not Found, ${DoginalsTransfer.transaction.txid}, ${input.index} `
          );
        const KeyOutputValue = `${IsValueInCache.txid}:${inputValue?.index}`;

        OutpuValueCache[KeyOutputValue] = inputValue?.amount;
      }

      const InscriptionLogicInput = DoginalsTransfer.transaction.inputs.slice(
        0,
        DoginalsTransfer.inscriptionInputIndex
      );

      const inputValue: number[] = [];

      for (const inscriptionInputs of InscriptionLogicInput) {
        const Key = `${inscriptionInputs.txid}:${inscriptionInputs.vin}`;

        const InputSats = OutpuValueCache[Key];

        if (!InputSats) throw new Error("Not Input sats found for tx");

        inputValue.push(InputSats);
      }

      const SumInputValues = inputValue.reduce((a, b) => a + b, 0) + 1;

      let newInscriptionIndex;
      let CurrentOutputSum = 0;

      for (const [
        i,
        Outputs,
      ] of DoginalsTransfer.transaction.outputs.entries()) {
        const OutputValue = Outputs.amount;
        if (OutputValue + CurrentOutputSum > SumInputValues) {
          newInscriptionIndex = i;
          break;
        }
        CurrentOutputSum += OutputValue;
      }

      const Inscription = DoginalsTransfer.inscriptionId;
      const prehash = DoginalsTransfer.prehash;

      const IsInscriptionInStoreQue = BlockInscriptionsSet.has(Inscription);

      const BlockCoinBase =
        coinbaseTransactions[DoginalsTransfer.transaction.blockNumber];

      let newlocation = BlockCoinBase.location;
      let newowner = BlockCoinBase.address;

      if (newInscriptionIndex !== undefined) {
        const newLoctionOutput =
          DoginalsTransfer.transaction.outputs[newInscriptionIndex];

        const newLocation = `${DoginalsTransfer.transaction.txid}:${newLoctionOutput.index}`;

        const newOwner = OutputScriptToAddress(newLoctionOutput.script);

        newlocation = newLocation;
        newowner = newOwner;
      }

      console.log(
        `New Location Update:- ${newlocation},, Inscription:- ${Inscription}`
      );

      if (IsInscriptionInStoreQue) {
        const InscriptionQue = BlockInscriptions.find(
          (a) => a.id === Inscription && a.prehash === prehash
        );

        if (!InscriptionQue) continue;

        InscriptionQue.location = newlocation;
        InscriptionQue.owner = newowner;
        continue;
      }

      LoctionUpdateInscriptions.push({
        location: newlocation,
        owner: newowner,
        inscriptionid: Inscription,
        prelocation: prehash,
      });
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
