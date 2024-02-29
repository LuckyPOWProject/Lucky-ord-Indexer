import Logger from "../../shared/system/logger";
import { DogecoinCoreRPCAuth } from "../../types/dogecoin-core-rpc.interface";
import { Sleep } from "../../utils/indexer-utlis";
const Bitcore = require("bitcoin-core");

class DogecoinCore {
  host: string;
  password: string;
  port: number;
  username: string;

  cli: any;

  constructor(auth: DogecoinCoreRPCAuth) {
    this.host = auth.host;
    this.port = auth.port;
    this.password = auth.password;
    this.username = auth.username;
  }

  private async createconnection() {
    const Config = {
      host: this.host,
      port: this.port,
      username: this.username,
      password: this.password,
    };
    const Client = new Bitcore(Config);
    return await Client;
  }

  async connect() {
    if (this.cli) {
      return;
    }

    this.cli = await this.createconnection();
  }

  async getBlockHash(blocknumber: number): Promise<string> {
    try {
      const LastBlock: string = await this.cli.getBlockHash(blocknumber);
      return LastBlock;
    } catch (error) {
      Logger.error(`Some error occour, retrying...`);
      await Sleep(10 * 1000);
      await this.connect();
      return this.getBlockHash(blocknumber);
    }
  }
  async getBlockHex(blockhash: string): Promise<string> {
    try {
      const LastBlock: string = await this.cli.getBlock(blockhash, false);
      return LastBlock;
    } catch (error) {
      Logger.error(`Some error occour, retrying...`);
      await Sleep(10 * 1000);
      await this.connect();
      return this.getBlockHex(blockhash);
    }
  }

  async getLastsynedBlock(): Promise<number> {
    try {
      const LastBlock: number = await this.cli.getBlockCount();
      return LastBlock;
    } catch (error) {
      Logger.error(`Some error occour, retrying...`);
      await Sleep(10 * 1000);
      await this.connect();
      return this.getLastsynedBlock();
    }
  }

  async GetTransaction(txid: string): Promise<any> {
    try {
      const TransactionData = await this.cli.getRawTransaction(txid, true);
      return TransactionData;
    } catch (error) {
      Logger.error(`Some error occour, retrying...`);
      await Sleep(10 * 1000);
      await this.connect();
      return this.GetTransaction(txid);
    }
  }

  async getOutPutValue(txid: string) {
    const transaction = await this.GetTransaction(txid);

    const Outputs = transaction.vout.map((e: any) => {
      const value = e.value * 1e8;
      const hash = txid;
      const index = e.n;
      return { value: value, index: index, hash: hash };
    });

    return Outputs;
  }
}

export default DogecoinCore;
