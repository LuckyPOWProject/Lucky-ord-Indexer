import * as bitcoin from "bitcoinjs-lib";
import { inputs } from "../types/dogecoin-interface";
import { ProtocolTag } from "../shared/system/protocol";
import { inscriptionData } from "../types/inscription-interface";

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

const DecodeInputScript = (inputs: inputs[]): inscriptionData[] => {
  try {
    const inscriptions: inscriptionData[] = [];

    inputs.map((e, index) => {
      const InputScript = Buffer.from(e.script, "hex");

      const ScriptDecode = bitcoin.script.decompile(InputScript);

      if (!ScriptDecode?.length) return;

      const Protocol = ScriptDecode?.shift()?.toString();

      if (Protocol?.toLocaleString() !== ProtocolTag) return; //not ordinals

      const TotalDataInjectedOp = ScriptDecode?.shift()?.toString();

      const DataPices = op_code_to_num(Number(TotalDataInjectedOp));

      const contentType = ScriptDecode.shift()?.toString();

      let remainingChunks = DataPices;

      let DoginalData = Buffer.alloc(0);

      let isComplete = true;

      while (remainingChunks) {
        const numofDataRemain = op_code_to_num(Number(ScriptDecode.shift()));

        if (remainingChunks - 1 !== numofDataRemain) {
          isComplete = false;
          console.log(`still some data need to be fetched`);
        }

        const NewData = ScriptDecode.shift();

        if (!NewData || typeof NewData === "number")
          throw new Error("Data Not Found or not valid");

        DoginalData = Buffer.concat([DoginalData, NewData]);

        remainingChunks -= 1;
      }
      if (DoginalData.length && contentType?.length)
        inscriptions.push({
          data: DoginalData.toString("hex"),
          contentType: contentType,
          index: index,
          isComplete: isComplete,
        });
    });
    return inscriptions;
  } catch (error) {
    throw error;
  }
};

export default DecodeInputScript;
