import * as bitcoin from "bitcoinjs-lib";
import { dogecoinNetwork } from "./dogecoin-network";
import { LoctionUpdates } from "../types/inscription-interface";

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
