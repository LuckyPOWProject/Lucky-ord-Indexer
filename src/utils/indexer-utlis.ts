import * as bitcoin from "bitcoinjs-lib";
import { dogecoinNetwork } from "./dogecoin-network";
import { LoctionUpdates } from "../types/inscription-interface";
import type {
  Outputdata,
  TransactionWithBlock,
  outputDecode,
} from "../types/dogecoin-interface";
import DogecoinCLI from "../api/dogecoin-core-rpc/node-connection";

export const OutputScriptToAddress = (script: string) => {
  try {
    const outputScriptDecoded = bitcoin.address.fromOutputScript(
      Buffer.from(script, "hex"),
      dogecoinNetwork
    );
    return outputScriptDecoded;
  } catch (error) {
    return script;
  }
};
export default function Decoder(txData: any): outputDecode {
  const vout = txData.vout;
  const txid = txData.txid;

  const outputs: Outputdata[] = vout.map((e: { value: number; n: number }) => {
    return { hash: `${txid}`, index: e.n, amount: e.value * 1e8 };
  });

  return { outputs: outputs };
}

export const ReverseHash = (hash: string): string => {
  return Buffer.from(hash, "hex").reverse().toString("hex");
};

export const GetInscriptionUpdateQuery = (data: LoctionUpdates[]) => {
  const Query = data.map((e) => {
    const filter = { id: e.inscriptionid, location: e.prelocation };
    const update = {
      $set: { location: e.location, owner: e.owner, offset: e.offset },
    };

    return {
      updateOne: { filter: filter, update: update },
    };
  });

  return Query;
};

export const Sleep = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};

export const FetchMissingInputsValue = async (
  hash: string[]
): Promise<{ hash: string; output: outputDecode }[]> => {
  try {
    const ARRAY_SIZE = 10;

    const DataFetch: string[][] = [[]];

    hash.map((e) => {
      if (DataFetch[DataFetch.length - 1].length <= ARRAY_SIZE) {
        return DataFetch[DataFetch.length - 1].push(e);
      }
      return DataFetch.push([e]);
    });

    const TxData = [];

    for (const df of DataFetch) {
      const txdata = df.map(async (e) => {
        return await DogecoinCLI.GetTransaction(e);
      });

      const data = (await Promise.all(txdata)).filter((a) => a !== undefined);

      if (data.length !== df.length) throw new Error("Faild to get some tx");

      TxData.push(data);
    }

    const txDecoded = TxData.flat(1).map((e) => {
      const Decoded = Decoder(e);

      return { hash: e.hash as string, output: Decoded };
    });
    return txDecoded;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const GetTransactionFee = async (
  inputsValue: Record<string, number>,
  transaction: TransactionWithBlock
) => {
  try {
    const inputsValues: number[] = [];

    const NON_EXIST_TX: string[] = []; //the controller
    const NON_EXIST_KEY: string[] = [];
    const NON_EXIST_CACHE = new Set(); //add to cache

    for (const input of transaction.inputs) {
      const hash = ReverseHash(input.txid);
      const key = `${hash}:${input.vin}`;
      const Value = inputsValue[key];

      if (!Value) {
        const IsHashAlreadyInList = NON_EXIST_CACHE.has(hash);
        NON_EXIST_KEY.push(key);
        if (IsHashAlreadyInList) continue;

        NON_EXIST_TX.push(hash);
        NON_EXIST_CACHE.add(hash);
        continue;
      }
      inputsValues.push(Value);
    }

    if (NON_EXIST_TX.length) {
      const InputsTransaction = await FetchMissingInputsValue(NON_EXIST_TX);

      //store the values to the cache
      InputsTransaction.map((e) => {
        e.output.outputs.map((outs) => {
          const KeyOutputValue = `${e.hash}:${outs.index}`;
          inputsValue[KeyOutputValue] = outs?.amount;
        });
      });

      //now set the value
      NON_EXIST_KEY.map((e) => {
        if (inputsValue[e] !== undefined) inputsValues.push(inputsValue[e]);
        else throw new Error(`Input value not found, ${e}`);
      });
    }

    if (inputsValues.length !== transaction.inputs.length)
      throw new Error("Input length and value length missmatch");

    const InputSum = inputsValues.reduce((a, b) => a + b, 0);

    const OuputSum = transaction.outputs.reduce((a, b) => a + b.amount, 0);

    const Fee = InputSum - OuputSum;
    return { Fee: Fee, inputsValue: inputsValue };
  } catch (error) {
    throw error;
  }
};

export const GetTransactionFeeSum = async (
  inputsValue: Record<string, number>,
  transaction: Map<number, TransactionWithBlock[]>,
  endIndex: number,
  blockNumber: number
) => {
  try {
    let CurrentFeeSum = 0;

    const SortedTransactions = transaction.get(blockNumber);
    if (!SortedTransactions) throw new Error("Faild to arrage transaction");

    const ST = SortedTransactions.sort((a, b) => a.index - b.index);

    for (let i = 0; i < endIndex - 1; i++) {
      const Transactions = ST[i];
      if (Transactions.coinbase) continue;

      const Fee = await GetTransactionFee(inputsValue, Transactions);

      CurrentFeeSum += Fee.Fee;
      inputsValue = Fee.inputsValue;
    }
    return { CurrentFeeSum: CurrentFeeSum, inputsValue };
  } catch (error) {
    throw error;
  }
};
