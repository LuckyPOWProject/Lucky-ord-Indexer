import * as bitcoin from "bitcoinjs-lib";
import { inputs } from "../types/dogecoin-interface";
import { ProtocolTag } from "../shared/system/protocol";
import { inscriptionDataTemp } from "../types/inscription-interface";
import { ReverseHash } from "./indexer-utlis";

const op_code_to_num = (opcode: number | Buffer): number | undefined => {
  if (typeof opcode !== "number") {
    if (opcode.length > 2) return undefined;

    const code = opcode.reverse();

    if (code.length === 1) return opcode[0];

    if (code.length === 2) return opcode[0] * 255 + opcode[1];

    return undefined;
  }

  if (opcode > 80 && opcode <= 96) {
    return opcode - 80;
  } else if (opcode === 0) {
    return 0;
  } else {
    return undefined;
  }
};

const DecodeInputScript = (inputs: inputs[]): inscriptionDataTemp[] => {
  try {
    const inscriptions: inscriptionDataTemp[] = [];
    inputs.map((e, index) => {
      const InputScript = Buffer.from(e.script, "hex");

      const ScriptDecode = bitcoin.script.decompile(InputScript);

      if (!ScriptDecode?.length) return;

      const Protocol = ScriptDecode?.shift();

      if (Protocol?.toString()?.toLocaleString() !== ProtocolTag) {
        if (Protocol === undefined) return;

        //lets check if its a remaining chunks

        const IsReamainingChunks = op_code_to_num(Protocol);

        if (IsReamainingChunks === undefined) return; //Not a Remaining Chunks

        if (ScriptDecode.length < 2) return;

        const OrginalChunks: (Buffer | number)[] = [];

        OrginalChunks.push(Protocol);
        OrginalChunks.push(...ScriptDecode);

        const DoginalRemainingData = GetInscriptionFromChunk(
          IsReamainingChunks + 1,
          OrginalChunks
        );

        inscriptions.push({
          index: index,
          isComplete: DoginalRemainingData.isComplete,
          IsremaingChunkPush: true,
          data: DoginalRemainingData.doginalData.toString("hex"),
          previousHash: `${ReverseHash(e.txid)}:${e.vin}`,
        });
        return;
      } //not ordinals
      const TotalDataInjectedOp = ScriptDecode?.shift();

      if (!TotalDataInjectedOp) return;

      const DataPices = op_code_to_num(TotalDataInjectedOp);

      const contentType = ScriptDecode.shift()?.toString();
      // console.log(ScriptDecode);

      const DoginalData = GetInscriptionFromChunk(
        Number(DataPices),
        ScriptDecode
      );

      if (DoginalData.doginalData.length && contentType?.length)
        inscriptions.push({
          data: DoginalData.doginalData.toString("hex"),
          contentType: contentType,
          index: index,
          isComplete: DoginalData.isComplete,
          IsremaingChunkPush: false,
          previousHash: `${ReverseHash(e.txid)}:${e.vin}`,
        });
    });

    return inscriptions;
  } catch (error) {
    throw error;
  }
};

const GetInscriptionFromChunk = (
  chunkLength: number,
  data: (number | Buffer)[]
): { doginalData: Buffer; isComplete: boolean } => {
  let remainingChunks = chunkLength;

  let DoginalData: Buffer = Buffer.alloc(0);

  let isComplete = true;

  while (remainingChunks) {
    const Data = data.shift();
    if (Data === undefined) break;

    const numofDataRemain = op_code_to_num(Data);

    if (remainingChunks - 1 !== numofDataRemain) {
      isComplete = false;

      break;
    }

    const NewData = data.shift();
    // console.log(NewData);

    if (!NewData || typeof NewData === "number") {
      throw new Error("Data Not Found or not valid");
    }

    DoginalData = Buffer.concat([DoginalData, NewData]);

    remainingChunks -= 1;
  }
  return { doginalData: DoginalData, isComplete };
};

export default DecodeInputScript;
