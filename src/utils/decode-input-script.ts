import * as bitcoin from "bitcoinjs-lib";
import { inputs } from "../types/dogecoin-interface";
import { ProtocolTag } from "../shared/system/protocol";
import { inscriptionDataTemp } from "../types/inscription-interface";
import { ReverseHash } from "./address-utlis";

const op_code_to_num = (opcode: number): number | undefined => {
  if (opcode > 80 && opcode < 96) {
    return opcode - 80;
  } else if (opcode === 0) {
    return 0;
  } else if (opcode === 2 || opcode === 1) {
    throw new Error("somethings should be done here !");
  }
  return undefined;
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

        const IsReamainingChunks = op_code_to_num(Number(Protocol));

        if (IsReamainingChunks === undefined) return; //Not a Remaining Chunks

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
          previousHash: `${ReverseHash(e.txid)}:${e.index}`,
        });
        return;
      } //not ordinals

      const TotalDataInjectedOp = ScriptDecode?.shift()?.toString();

      const DataPices = op_code_to_num(Number(TotalDataInjectedOp));

      const contentType = ScriptDecode.shift()?.toString();

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
    const numofDataRemain = op_code_to_num(Number(data.shift()));
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
