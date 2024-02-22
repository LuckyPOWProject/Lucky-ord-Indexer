export interface BlockHeader {
  version?: string;
  previousBlockHash?: string;
  markleroot?: string;
  blocktime?: number;
  bits?: string;
  noce?: number;
}

export interface inputs {
  txid: string;
  vin: number;
  script: string;
  sequence: number;
  index: number;
}

export interface inputDecoded {
  inputs: inputs[];
  inputendIndex: number;
}

export interface outputs {
  amount: number;
  index: number;
  script: string;
}
export interface outputDecoded {
  output: outputs[];
  outputendIndex: number;
  lastlock: string;
  blockhash?: string;
}

export interface merklebranch {
  merklebranch: string[];
  lastmerklebranchendindex: number;
}

export interface auxpow {
  version?: string;
  input?: inputs[];
  output?: outputs[];
  merklebranch?: string[];
  chainmerklebranch?: string[];
  parentblockhash?: string;
  lastlock?: string;
  blockhash?: string;
}

export interface transactionRough {
  version?: string;
  inputs?: inputs[];
  output?: outputs[];
  transactionBytes?: number;
}

export interface Transaction {
  hex: string;
  version: string;
  inputs: inputs[];
  output: outputs[];
  txid: string;
  isCoinBase: boolean;
}

export interface Block {
  number: number;
  blockheader?: BlockHeader;
  auxpow?: auxpow;
  transactions?: Transaction[];
}

export interface TransactionWithBlock {
  blockNumber: number;
  time: number;
  index: number;
  inputs: inputs[];
  outputs: outputs[];
  txid: string;
  coinbase: boolean;
}

export interface TransactionWithPreId {
  transaction: TransactionWithBlock;
  prehash: string;
  inscriptionInputIndex: number;
  inscriptionId: string;
}

export interface coinbaseTrasactionMeta {
  location: string;
  address: string;
}
