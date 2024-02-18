"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const bitcoin = __importStar(require("bitcoinjs-lib"));
class BlockHeaderDecoder {
    startIndex = 0;
    blockHex;
    blockHexBuffer;
    byte1 = 1;
    byte3 = 3;
    byte4 = 4;
    byte5 = 5;
    byte8 = 8;
    byte9 = 9;
    byte32 = 32;
    byte36 = 36;
    bytes80 = 80;
    constructor(hex) {
        this.blockHex = hex;
        const BlockHexBuffer = Buffer.from(this.blockHex, "hex");
        this.blockHexBuffer = BlockHexBuffer;
    }
    decode() {
        const Block = {};
        const BlockHeaderInfo = this.getBlockHeader(this.blockHexBuffer);
        Block["blockheader"] = BlockHeaderInfo;
        if (BlockHeaderInfo.noce === 0) {
            const auxpow = this.decodeauxpow(this.blockHexBuffer);
            Block["auxpow"] = auxpow;
        }
        const transactions = this.getBlockTransactions(this.blockHexBuffer);
        Block["transactions"] = transactions;
        return Block;
    }
    getBlockTransactions(blockBuffer) {
        let transactionStartIndex = 0;
        const transactionStartBuff = blockBuffer.slice(this.startIndex);
        const BytesUsed = this.getVintBytes(transactionStartBuff);
        const transactionCount = this.getScriptLength(transactionStartBuff, transactionStartIndex, BytesUsed);
        transactionStartIndex += this.byte1;
        const transactions = [];
        for (let i = 0; i < transactionCount; i++) {
            const NewTransactionBuff = transactionStartBuff.slice(transactionStartIndex);
            const transaction = this.decodeTransaction(NewTransactionBuff);
            if (!transaction.inputs?.length ||
                !transaction.output?.length ||
                !transaction.version)
                throw new Error("Error in decoding transaction");
            if (!transaction.transactionBytes)
                throw new Error("Transaction bytes missmatched");
            const TransactionHex_ = NewTransactionBuff.slice(0, transaction.transactionBytes);
            const transactionObj = bitcoin.Transaction.fromBuffer(TransactionHex_);
            transactions.push({
                inputs: transaction.inputs,
                output: transaction.output,
                version: transaction.version,
                hex: TransactionHex_.toString("hex"),
                txid: transactionObj.getHash().reverse().toString("hex"),
                isCoinBase: transactionObj.isCoinbase(),
            });
            transactionStartIndex += transaction.transactionBytes;
        }
        return transactions;
    }
    decodeTransaction(blockBuffer) {
        let CurrentTransactionIndexBytes = 0;
        let transaction = {};
        const transactionVersion = this.sliceBytes(CurrentTransactionIndexBytes, CurrentTransactionIndexBytes + this.byte4, blockBuffer, false);
        CurrentTransactionIndexBytes += this.byte4;
        //Inputs
        const InputStartBuff = blockBuffer.slice(CurrentTransactionIndexBytes);
        const input = this.getInput(InputStartBuff);
        //outputs
        const OutputStartBuff = InputStartBuff.slice(input.inputendIndex);
        const output = this.getOutput(OutputStartBuff);
        const BytesUsed = CurrentTransactionIndexBytes +
            input.inputendIndex +
            output.outputendIndex;
        transaction.inputs = input.inputs;
        transaction.output = output.output;
        transaction.transactionBytes = BytesUsed;
        transaction.version = transactionVersion;
        return transaction;
    }
    decodeauxpow(blockBufferPOW) {
        const auxpowBuffStart = blockBufferPOW.slice(this.startIndex);
        const auxpow = {};
        let auxpowindex = 0;
        //transaction version
        const transactionVersion = this.sliceBytes(auxpowindex, auxpowindex + this.byte4, auxpowBuffStart, true);
        auxpowindex += this.byte4;
        //Inputs
        const InputStartsBuff = auxpowBuffStart.slice(auxpowindex);
        const Inputs = this.getInput(InputStartsBuff);
        const LastInputTrimedIndex = Inputs.inputendIndex;
        //Outputs
        const OutputStartBuff = InputStartsBuff.slice(LastInputTrimedIndex);
        const Outputs = this.getOutput(OutputStartBuff, true);
        //merklebranch
        const LastOutputTrimedIndex = Outputs.outputendIndex;
        const merklebranchStartBuff = OutputStartBuff.slice(LastOutputTrimedIndex);
        const merklebranch = this.getmerklebranch(merklebranchStartBuff);
        //chainmerklebranch
        const LastMerkelbranch = merklebranch.lastmerklebranchendindex + this.byte4; //(lets ignore the 4 bytes data of bitmask )
        const chainmerklebranchBuff = merklebranchStartBuff.slice(LastMerkelbranch);
        const chainmerklebranch = this.getmerklebranch(chainmerklebranchBuff);
        //ParentBlockHeader
        const lastmerklebranchendindex = chainmerklebranch.lastmerklebranchendindex + this.byte4; //(lets ignore the 4 bytes data of bitmask )
        const ParentBlockHeader = chainmerklebranchBuff
            .slice(lastmerklebranchendindex, lastmerklebranchendindex + this.bytes80)
            .toString("hex");
        const TotalBytesUsed = Inputs.inputendIndex +
            Outputs.outputendIndex +
            merklebranch.lastmerklebranchendindex +
            chainmerklebranch.lastmerklebranchendindex +
            this.bytes80 +
            this.byte8 +
            auxpowindex;
        this.startIndex += TotalBytesUsed;
        auxpow.output = Outputs.output;
        auxpow.input = Inputs.inputs;
        auxpow.parentblockhash = ParentBlockHeader;
        auxpow.version = transactionVersion;
        auxpow.merklebranch = merklebranch.merklebranch;
        auxpow.chainmerklebranch = chainmerklebranch.merklebranch;
        auxpow.lastlock = Outputs.lastlock;
        auxpow.blockhash = Outputs.blockhash;
        return auxpow;
    }
    getmerklebranch(rawBuffer) {
        let currentmerklebranchIndex = 0;
        const merklebranchCount = parseInt(this.sliceBytes(currentmerklebranchIndex, currentmerklebranchIndex + this.byte1, rawBuffer, true), 16);
        currentmerklebranchIndex += this.byte1;
        const merklebranch = [];
        for (let i = 0; i < merklebranchCount; i++) {
            const merklebranchHash = this.sliceBytes(currentmerklebranchIndex, currentmerklebranchIndex + this.byte32, rawBuffer, true);
            currentmerklebranchIndex += this.byte32;
            merklebranch.push(merklebranchHash);
        }
        return {
            merklebranch: merklebranch,
            lastmerklebranchendindex: currentmerklebranchIndex,
        };
    }
    getInput(rawBuffer) {
        let InputIndexStart = 0;
        const Inputs = [];
        const BytesUsed = this.getVintBytes(rawBuffer);
        const numOfInputTX = this.getScriptLength(rawBuffer, InputIndexStart, BytesUsed); //get input count
        InputIndexStart += BytesUsed;
        for (let i = 0; i < numOfInputTX; i++) {
            //previous output
            const PreviousOutputHash = this.sliceBytes(InputIndexStart, InputIndexStart + this.byte32, rawBuffer, true);
            InputIndexStart += this.byte32;
            const PreviousOutputIndex = parseInt(this.sliceBytes(InputIndexStart, InputIndexStart + this.byte4, rawBuffer, true), 16);
            InputIndexStart += this.byte4;
            //Scriptlength
            const BytesUsed = this.getVintBytes(rawBuffer.slice(InputIndexStart));
            const Scriptlength = this.getScriptLength(rawBuffer, InputIndexStart, BytesUsed);
            InputIndexStart += BytesUsed;
            //script
            const ScriptStartIndex = InputIndexStart;
            const ScriptEndIndex = ScriptStartIndex + Scriptlength;
            const Script = this.sliceBytes(ScriptStartIndex, ScriptEndIndex, rawBuffer);
            InputIndexStart = ScriptEndIndex;
            const Sequence = parseInt(this.sliceBytes(InputIndexStart, InputIndexStart + this.byte4, rawBuffer, true), 16);
            InputIndexStart += this.byte4;
            Inputs.push({
                txid: PreviousOutputHash,
                vin: PreviousOutputIndex,
                script: Script,
                sequence: Sequence,
                index: i,
            });
        }
        return { inputendIndex: InputIndexStart, inputs: Inputs };
    }
    getOutput(rawBuffer, isauxpow = false) {
        let OutputStartIndex = 0;
        const BytesUsed = this.getVintBytes(rawBuffer);
        const numofoutputs = this.getScriptLength(rawBuffer, OutputStartIndex, BytesUsed);
        OutputStartIndex += BytesUsed;
        const Outputs = [];
        for (let i = 0; i < numofoutputs; i++) {
            const Amount = parseInt(this.sliceBytes(OutputStartIndex, OutputStartIndex + this.byte8, rawBuffer, true), 16);
            OutputStartIndex += this.byte8;
            //script
            const BytesUsed = this.getVintBytes(rawBuffer.slice(OutputStartIndex));
            const Scriptlength = this.getScriptLength(rawBuffer, OutputStartIndex, BytesUsed);
            OutputStartIndex += BytesUsed;
            const ScriptStartIndex = OutputStartIndex;
            const ScriptEndIndex = OutputStartIndex + Scriptlength;
            const Script = this.sliceBytes(ScriptStartIndex, ScriptEndIndex, rawBuffer);
            OutputStartIndex = ScriptEndIndex;
            Outputs.push({ index: i, script: Script, amount: Amount });
        }
        const lastlock = this.sliceBytes(OutputStartIndex, OutputStartIndex + this.byte4, rawBuffer, true);
        OutputStartIndex += this.byte4;
        let blockhash;
        if (isauxpow) {
            blockhash = this.sliceBytes(OutputStartIndex, OutputStartIndex + this.byte32, rawBuffer, true);
            OutputStartIndex += this.byte32;
        }
        return {
            outputendIndex: OutputStartIndex,
            lastlock: lastlock,
            blockhash: blockhash,
            output: Outputs,
        };
    }
    getBlockHeader(rawBuffer) {
        //The header of bitcoin block is of 80 bytges
        let BlockHeader = {};
        let StartSliceIndex = 0;
        const BlockHeaderBuffer = rawBuffer.slice(0, this.bytes80);
        //Block Version
        const BlockVersion = this.sliceBytes(StartSliceIndex, this.byte4, BlockHeaderBuffer, true);
        StartSliceIndex += this.byte4; // Increase the next slice index
        //Previous Block Hash
        const PreviousBlockHash = this.sliceBytes(StartSliceIndex, StartSliceIndex + this.byte32, BlockHeaderBuffer, true);
        StartSliceIndex += this.byte32;
        //merkleroot
        const merkleroot = this.sliceBytes(StartSliceIndex, StartSliceIndex + this.byte32, BlockHeaderBuffer, true);
        StartSliceIndex += this.byte32;
        //time
        const BlockTime = parseInt(Buffer.from(this.sliceBytes(StartSliceIndex, StartSliceIndex + this.byte4, BlockHeaderBuffer, true), "hex")
            .reverse()
            .toString("hex"), 16);
        StartSliceIndex += this.byte4;
        //bits
        const bits = this.sliceBytes(StartSliceIndex, StartSliceIndex + this.byte4, BlockHeaderBuffer, true);
        StartSliceIndex += this.byte4;
        //noce
        const noce = parseInt(Buffer.from(this.sliceBytes(StartSliceIndex, StartSliceIndex + this.byte4, BlockHeaderBuffer, true), "hex")
            .reverse()
            .toString("hex"), 16);
        StartSliceIndex += this.byte4;
        BlockHeader["version"] = BlockVersion;
        BlockHeader["previousBlockHash"] = PreviousBlockHash;
        BlockHeader["markleroot"] = merkleroot;
        BlockHeader["noce"] = noce;
        BlockHeader["blocktime"] = BlockTime;
        BlockHeader["bits"] = bits;
        this.startIndex = StartSliceIndex;
        return BlockHeader;
    }
    sliceBytes(Startbytes, EndBytes, blockBuffer, reverse = false) {
        const SlicedBuff = blockBuffer.slice(Startbytes, EndBytes);
        return reverse ? SlicedBuff.toString("hex") : SlicedBuff.toString("hex");
    }
    getScriptLength(hex, InputIndexStart, BytesUsed) {
        const Scriptlength = this.sliceBytes(InputIndexStart, InputIndexStart + BytesUsed, hex);
        if (BytesUsed === this.byte1) {
            return parseInt(Buffer.from(Scriptlength, "hex").reverse().toString("hex"), 16);
        }
        const ScriptLengthExact = Buffer.from(Scriptlength, "hex")
            .slice(1)
            .reverse()
            .toString("hex");
        return parseInt(ScriptLengthExact, 16);
    }
    getVintBytes(hex) {
        const value = hex.slice(0, 1).toString("hex").toLocaleUpperCase();
        if (value === "FD") {
            return this.byte3;
        }
        else if (value === "FE") {
            return this.byte5;
        }
        else if (value === "FF") {
            return this.byte9;
        }
        else {
            return this.byte1;
        }
    }
}
exports.default = BlockHeaderDecoder;
