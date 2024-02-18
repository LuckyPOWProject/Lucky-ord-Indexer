"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bitcore = require("bitcoin-core");
class DogecoinCore {
    host;
    password;
    port;
    username;
    cli;
    constructor(auth) {
        this.host = auth.host;
        this.port = auth.port;
        this.password = auth.password;
        this.username = auth.username;
    }
    async createconnection() {
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
    async getBlockHash(blocknumber) {
        const LastBlock = await this.cli.getBlockHash(blocknumber);
        return LastBlock;
    }
    async getBlockHex(blockhash) {
        const LastBlock = await this.cli.getBlock(blockhash, false);
        return LastBlock;
    }
    async getLastsynedBlock() {
        const LastBlock = await this.cli.getBlockCount();
        return LastBlock;
    }
}
exports.default = DogecoinCore;
