export interface inscriptionDataTemp {
  contentType?: string;
  data?: string;
  index?: number;
  id?: string;
  isComplete?: boolean;
  IsremaingChunkPush: boolean;
  previousHash?: string;
}
export interface inscription {
  contentType?: string;
  data?: string;
}

export interface inscriptionStoreModel {
  id?: string;
  inscriptionNumber?: number;
  inscription: inscription;
  block: number;
  time?: number;
  txid: string;
  owner?: string;
  minter?: string;
  index: number;
  prehash?: string;
  location: string;
}

export interface inscriptionIncomplete {
  id: string;
  location: string;
  inscription: inscription;
  txid: string;
  block: number;
  time: number;
  index: number;
}
export interface LoctionUpdates {
  inscriptionid: string;
  location: string;
  prelocation: string;
  owner: string;
}
