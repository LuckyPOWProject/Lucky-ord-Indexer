export enum DataTypes {
  inscription_id = "id",
  owner = "owner",
  location = "location",
  inscriptionNumber = "inscriptionNumber",
}

export interface dataArray {
  result: any;
  count: number;
}

export interface InscriptionResponseData {
  id: string;
  block: number;
  owner: string;
  location: string;
  offset: number;
  txid: string;
  time: number;
  inscriptionNumber: number;
}
