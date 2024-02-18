import * as bitcoin from "bitcoinjs-lib";
import { dogecoinNetwork } from "./dogecoin-network";

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
