"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dogecoin_core_rpc_1 = __importDefault(require("../api/dogecoin-core-rpc"));
const config_1 = __importDefault(require("../shared/system/config"));
const address_utlis_1 = require("../utils/address-utlis");
const blockheader_decoder_1 = __importDefault(require("../utils/blockheader-decoder"));
const decode_input_script_1 = __importDefault(require("../utils/decode-input-script"));
const DoginalsIndexer = async () => {
    const DogecoinCLI = new dogecoin_core_rpc_1.default({
        username: config_1.default.user,
        password: config_1.default.password,
        host: config_1.default.host,
        port: config_1.default.port,
    });
    await DogecoinCLI.connect();
    let startBlock = 4609788;
    while (1) {
        const BlockHex = await DogecoinCLI.getBlockHash(startBlock);
        const BlockRawHex = await DogecoinCLI.getBlockHex(BlockHex);
        const BlockDecoder = new blockheader_decoder_1.default(BlockRawHex);
        const decodedBlock = BlockDecoder.decode();
        if (!decodedBlock.transactions)
            throw new Error("Transaction not found");
        const inscriptionData = [];
        decodedBlock.transactions.map((e, index) => {
            const txid = e.txid;
            const inputs = e.inputs;
            const outputs = e.output;
            if (e.isCoinBase)
                return;
            //Now lets see if input contains inscriptions
            const inscriptionInInput = (0, decode_input_script_1.default)(inputs);
            console.log(txid);
            const inscriptionOwner = (0, address_utlis_1.OutputScriptToAddress)(outputs[0].script);
            if (inscriptionInInput.length === 0)
                return;
            inscriptionInInput.map((el) => {
                const id = `${txid}i${el.index}`;
                inscriptionData.push({
                    inscription: {
                        data: el.data,
                        isComplete: el.isComplete,
                        id: id,
                        index: el.index,
                        contentType: el.contentType,
                    },
                    inputs: e.inputs,
                    outputs: e.output,
                    block: startBlock,
                    time: decodedBlock.blockheader?.blocktime,
                    owner: inscriptionOwner,
                    txid: e.txid,
                    minter: inscriptionOwner,
                    index: index,
                });
            });
        });
        console.log(inscriptionData);
        console.log(`scanned block `, startBlock);
        startBlock += 1;
    }
};
exports.default = DoginalsIndexer;
