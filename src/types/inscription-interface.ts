import { inputs, outputs } from "./dogecoin-interface";

export interface inscriptionData {
  contentType?: string;
  data?: string;
  index?: number;
  id?: string;
  isComplete?: boolean;
  inscriptionNumber?: number;
}

export interface inscriptionStoreModel {
  inscription: inscriptionData;
  inputs: inputs[];
  outputs: outputs[];
  block: number;
  time?: number;
  txid: string;
  owner: string;
  minter: string;
  index: number;
}
