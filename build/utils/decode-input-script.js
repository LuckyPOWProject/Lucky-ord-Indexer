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
const protocol_1 = require("../shared/system/protocol");
const op_code_to_num = (opcode) => {
    if (opcode > 80 && opcode < 96) {
        return opcode - 80;
    }
    else if (opcode === 0) {
        return 0;
    }
    else if (opcode === 2 || opcode === 1) {
        throw new Error("somethings should be done here !");
    }
    return undefined;
};
const DecodeInputScript = (inputs) => {
    try {
        const inscriptions = [];
        inputs.map((e, index) => {
            const InputScript = Buffer.from(e.script, "hex");
            const ScriptDecode = bitcoin.script.decompile(InputScript);
            if (!ScriptDecode?.length)
                return;
            const Protocol = ScriptDecode?.shift()?.toString();
            if (Protocol?.toLocaleString() !== protocol_1.ProtocolTag)
                return; //not ordinals
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
    }
    catch (error) {
        throw error;
    }
};
exports.default = DecodeInputScript;
