const { parentPort, workerData } = require("node:worker_threads");

const Inputs = workerData.Inputs;
const Outputs = workerData.Outputs;
const Inscriptions = workerData.Inscription;

const InscriptionResult = [];
console.log(Inscriptions.length);
for (const Inscription of Inscriptions) {
  const offsets = Inscription.offset;

  const inputSum = offsets + Inputs;

  let outputIndex;

  let offset = 0;

  let sumOutput = 0;
  for (let index = 0; index < Outputs.length; index++) {
    const e = Outputs[index];

    if (e.value + sumOutput > inputSum) {
      outputIndex = index;
      offset = inputSum - sumOutput;
      break;
    }

    sumOutput += e.value;
  }
  InscriptionResult.push({ index: outputIndex, offset, id: Inscription.id });
}

parentPort.postMessage(InscriptionResult);
