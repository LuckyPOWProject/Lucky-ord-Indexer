import * as bitcoin from "bitcoinjs-lib";
import { dogecoinNetwork } from "./dogecoin-network";
import { LoctionUpdates } from "../types/inscription-interface";
import { Outputdata, outputDecode } from "../types/dogecoin-interface";

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
    const update = { $set: { location: e.location, owner: e.owner } };

    return {
      updateOne: { filter: filter, update: update },
    };
  });

  return Query;
};
