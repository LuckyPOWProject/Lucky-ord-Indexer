import {
  Block,
  BlockHeader,
  Transaction,
  auxpow,
  inputDecoded,
  inputs,
  merklebranch,
  outputDecoded,
  outputs,
  transactionRough,
} from "../types/dogecoin-interface";

import * as bitcoin from "bitcoinjs-lib";

class BlockHeaderDecoder {
  startIndex = 0;
  blockHex: string;
  blockHexBuffer: Buffer;

  byte1 = 1;
  byte3 = 3;
  byte4 = 4;
  byte5 = 5;
  byte8 = 8;
  byte9 = 9;
  byte32 = 32;
  byte36 = 36;
  bytes80 = 80;

  constructor(hex: string) {
    this.blockHex = hex;

    const BlockHexBuffer = Buffer.from(this.blockHex, "hex");
    this.blockHexBuffer = BlockHexBuffer;
  }

  decode(number: number) {
    const Block: Block = { number: number };

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

  getBlockTransactions(blockBuffer: Buffer): Transaction[] {
    let transactionStartIndex = 0;

    const transactionStartBuff = blockBuffer.slice(this.startIndex);

    const BytesUsed = this.getVintBytes(transactionStartBuff);

    const transactionCount = this.getScriptLength(
      transactionStartBuff,
      transactionStartIndex,
      BytesUsed
    );

    transactionStartIndex += BytesUsed;

    const transactions: Transaction[] = [];

    for (let i = 0; i < transactionCount; i++) {
      const NewTransactionBuff = transactionStartBuff.slice(
        transactionStartIndex
      );

      const transaction = this.decodeTransaction(NewTransactionBuff);
      if (
        !transaction.inputs?.length ||
        !transaction.output?.length ||
        !transaction.version
      )
        throw new Error("Error in decoding transaction");

      if (!transaction.transactionBytes)
        throw new Error("Transaction bytes missmatched");

      const TransactionHex_ = NewTransactionBuff.slice(
        0,
        transaction.transactionBytes
      );

      const id = bitcoin.crypto
        .hash256(TransactionHex_)
        .reverse()
        .toString("hex");

      transactions.push({
        inputs: transaction.inputs,
        output: transaction.output,
        version: transaction.version,
        hex: TransactionHex_.toString("hex"),
        txid: id,
        isCoinBase: i === 0 ? true : false, // 0 is coinbase
      });

      transactionStartIndex += transaction.transactionBytes;
    }

    return transactions;
  }

  decodeTransaction(blockBuffer: Buffer): transactionRough {
    let CurrentTransactionIndexBytes = 0;

    let transaction: transactionRough = {};

    const transactionVersion = this.sliceBytes(
      CurrentTransactionIndexBytes,
      CurrentTransactionIndexBytes + this.byte4,
      blockBuffer,
      false
    );

    CurrentTransactionIndexBytes += this.byte4;

    //Inputs
    const InputStartBuff = blockBuffer.slice(CurrentTransactionIndexBytes);

    const input = this.getInput(InputStartBuff);

    //outputs

    const OutputStartBuff = InputStartBuff.slice(input.inputendIndex);
    const output = this.getOutput(OutputStartBuff);

    const BytesUsed =
      CurrentTransactionIndexBytes +
      input.inputendIndex +
      output.outputendIndex;

    transaction.inputs = input.inputs;
    transaction.output = output.output;
    transaction.transactionBytes = BytesUsed;
    transaction.version = transactionVersion;

    return transaction;
  }

  decodeauxpow(blockBufferPOW: Buffer): auxpow {
    const auxpowBuffStart = blockBufferPOW.slice(this.startIndex);

    const auxpow: auxpow = {};

    let auxpowindex = 0;

    //transaction version

    const transactionVersion = this.sliceBytes(
      auxpowindex,
      auxpowindex + this.byte4,
      auxpowBuffStart,
      true
    );

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
    const lastmerklebranchendindex =
      chainmerklebranch.lastmerklebranchendindex + this.byte4; //(lets ignore the 4 bytes data of bitmask )

    const ParentBlockHeader = chainmerklebranchBuff
      .slice(lastmerklebranchendindex, lastmerklebranchendindex + this.bytes80)
      .toString("hex");

    const TotalBytesUsed =
      Inputs.inputendIndex +
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

  getmerklebranch(rawBuffer: Buffer): merklebranch {
    let currentmerklebranchIndex = 0;

    const merklebranchCount = parseInt(
      this.sliceBytes(
        currentmerklebranchIndex,
        currentmerklebranchIndex + this.byte1,
        rawBuffer,
        true
      ),
      16
    );

    currentmerklebranchIndex += this.byte1;

    const merklebranch: string[] = [];

    for (let i = 0; i < merklebranchCount; i++) {
      const merklebranchHash = this.sliceBytes(
        currentmerklebranchIndex,
        currentmerklebranchIndex + this.byte32,
        rawBuffer,
        true
      );
      currentmerklebranchIndex += this.byte32;

      merklebranch.push(merklebranchHash);
    }

    return {
      merklebranch: merklebranch,
      lastmerklebranchendindex: currentmerklebranchIndex,
    };
  }

  getInput(rawBuffer: Buffer): inputDecoded {
    let InputIndexStart = 0;

    const Inputs: inputs[] = [];

    const BytesUsed = this.getVintBytes(rawBuffer);

    const numOfInputTX = this.getScriptLength(
      rawBuffer,
      InputIndexStart,
      BytesUsed
    ); //get input count

    InputIndexStart += BytesUsed;

    for (let i = 0; i < numOfInputTX; i++) {
      //previous output
      const PreviousOutputHash = this.sliceBytes(
        InputIndexStart,
        InputIndexStart + this.byte32,
        rawBuffer,
        true
      );

      InputIndexStart += this.byte32;

      const PreviousOutputIndex = parseInt(
        this.sliceBytes(
          InputIndexStart,
          InputIndexStart + this.byte4,
          rawBuffer,
          true
        ),
        16
      );

      InputIndexStart += this.byte4;
      //Scriptlength

      const BytesUsed = this.getVintBytes(rawBuffer.slice(InputIndexStart));

      const Scriptlength = this.getScriptLength(
        rawBuffer,
        InputIndexStart,
        BytesUsed
      );

      InputIndexStart += BytesUsed;

      //script
      const ScriptStartIndex = InputIndexStart;
      const ScriptEndIndex = ScriptStartIndex + Scriptlength;

      const Script = this.sliceBytes(
        ScriptStartIndex,
        ScriptEndIndex,
        rawBuffer
      );

      InputIndexStart = ScriptEndIndex;

      const Sequence = parseInt(
        this.sliceBytes(
          InputIndexStart,
          InputIndexStart + this.byte4,
          rawBuffer,
          true
        ),
        16
      );
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

  getOutput(rawBuffer: Buffer, isauxpow: boolean = false): outputDecoded {
    let OutputStartIndex = 0;

    const BytesUsed = this.getVintBytes(rawBuffer);

    const numofoutputs = this.getScriptLength(
      rawBuffer,
      OutputStartIndex,
      BytesUsed
    );

    OutputStartIndex += BytesUsed;

    const Outputs: outputs[] = [];

    for (let i = 0; i < numofoutputs; i++) {
      const Amount = parseInt(
        this.sliceBytes(
          OutputStartIndex,
          OutputStartIndex + this.byte8,
          rawBuffer,
          true
        ),
        16
      );

      OutputStartIndex += this.byte8;

      //script
      const BytesUsed = this.getVintBytes(rawBuffer.slice(OutputStartIndex));

      const Scriptlength = this.getScriptLength(
        rawBuffer,
        OutputStartIndex,
        BytesUsed
      );

      OutputStartIndex += BytesUsed;

      const ScriptStartIndex = OutputStartIndex;
      const ScriptEndIndex = OutputStartIndex + Scriptlength;

      const Script = this.sliceBytes(
        ScriptStartIndex,
        ScriptEndIndex,
        rawBuffer
      );

      OutputStartIndex = ScriptEndIndex;

      Outputs.push({ index: i, script: Script, amount: Amount });
    }

    const lastlock = this.sliceBytes(
      OutputStartIndex,
      OutputStartIndex + this.byte4,
      rawBuffer,
      true
    );

    OutputStartIndex += this.byte4;

    let blockhash: string | undefined;

    if (isauxpow) {
      blockhash = this.sliceBytes(
        OutputStartIndex,
        OutputStartIndex + this.byte32,
        rawBuffer,
        true
      );

      OutputStartIndex += this.byte32;
    }
    return {
      outputendIndex: OutputStartIndex,
      lastlock: lastlock,
      blockhash: blockhash,
      output: Outputs,
    };
  }

  getBlockHeader(rawBuffer: Buffer) {
    //The header of bitcoin block is of 80 bytges

    let BlockHeader: BlockHeader = {};

    let StartSliceIndex = 0;

    const BlockHeaderBuffer = rawBuffer.slice(0, this.bytes80);

    //Block Version
    const BlockVersion = this.sliceBytes(
      StartSliceIndex,
      this.byte4,
      BlockHeaderBuffer,
      true
    );

    StartSliceIndex += this.byte4; // Increase the next slice index

    //Previous Block Hash

    const PreviousBlockHash = this.sliceBytes(
      StartSliceIndex,
      StartSliceIndex + this.byte32,
      BlockHeaderBuffer,
      true
    );

    StartSliceIndex += this.byte32;

    //merkleroot

    const merkleroot = this.sliceBytes(
      StartSliceIndex,
      StartSliceIndex + this.byte32,
      BlockHeaderBuffer,
      true
    );

    StartSliceIndex += this.byte32;

    //time

    const BlockTime = parseInt(
      Buffer.from(
        this.sliceBytes(
          StartSliceIndex,
          StartSliceIndex + this.byte4,
          BlockHeaderBuffer,
          true
        ),
        "hex"
      )
        .reverse()
        .toString("hex"),
      16
    );

    StartSliceIndex += this.byte4;

    //bits
    const bits = this.sliceBytes(
      StartSliceIndex,
      StartSliceIndex + this.byte4,
      BlockHeaderBuffer,
      true
    );

    StartSliceIndex += this.byte4;

    //noce

    const noce = parseInt(
      Buffer.from(
        this.sliceBytes(
          StartSliceIndex,
          StartSliceIndex + this.byte4,
          BlockHeaderBuffer,
          true
        ),
        "hex"
      )
        .reverse()
        .toString("hex"),
      16
    );

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

  sliceBytes(
    Startbytes: number,
    EndBytes: number,
    blockBuffer: Buffer,
    reverse: boolean = false
  ) {
    const SlicedBuff = blockBuffer.slice(Startbytes, EndBytes);

    return reverse ? SlicedBuff.toString("hex") : SlicedBuff.toString("hex");
  }

  getScriptLength(
    hex: Buffer,
    InputIndexStart: number,
    BytesUsed: number
  ): number {
    const Scriptlength = this.sliceBytes(
      InputIndexStart,
      InputIndexStart + BytesUsed,
      hex
    );

    if (BytesUsed === this.byte1) {
      return parseInt(
        Buffer.from(Scriptlength, "hex").reverse().toString("hex"),
        16
      );
    }

    const ScriptLengthExact = Buffer.from(Scriptlength, "hex")
      .slice(1)
      .reverse()
      .toString("hex");

    return parseInt(ScriptLengthExact, 16);
  }

  getVintBytes(hex: Buffer): number {
    const value = hex.slice(0, 1).toString("hex").toLocaleUpperCase();

    if (value === "FD") {
      return this.byte3;
    } else if (value === "FE") {
      return this.byte5;
    } else if (value === "FF") {
      return this.byte9;
    } else {
      return this.byte1;
    }
  }
}

export default BlockHeaderDecoder;
