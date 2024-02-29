import * as bitcoin from "bitcoinjs-lib";
import { dogecoinNetwork } from "./dogecoin-network";
import { LoctionUpdates } from "../types/inscription-interface";
import type { Outputdata, outputDecode } from "../types/dogecoin-interface";
import DogecoinCLI from "../api/dogecoin-core-rpc/node-connection";

export const OutputScriptToAddress = (script: string) => {
  try {
    const outputScriptDecoded = bitcoin.address.fromOutputScript(
      Buffer.from(script, "hex"),
      dogecoinNetwork
    );
    return outputScriptDecoded;
  } catch (error) {
    throw error;
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
    throw error;
  }
};
