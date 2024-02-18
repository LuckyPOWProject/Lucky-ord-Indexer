import DogecoinCore from "../api/dogecoin-core-rpc";
import SystemConfig from "../shared/system/config";
import { inscriptionStoreModel } from "../types/inscription-interface";
import { OutputScriptToAddress } from "../utils/address-utlis";
import BlockHeaderDecoder from "../utils/blockheader-decoder";
import DecodeInputScript from "../utils/decode-input-script";

const DoginalsIndexer = async () => {
  const DogecoinCLI = new DogecoinCore({
    username: SystemConfig.user,
    password: SystemConfig.password,
    host: SystemConfig.host,
    port: SystemConfig.port,
  });

  await DogecoinCLI.connect();

  let startBlock = 4609853;
  while (1) {
    const BlockHex = await DogecoinCLI.getBlockHash(startBlock);

    const BlockRawHex: any = await DogecoinCLI.getBlockHex(BlockHex);

    const BlockDecoder = new BlockHeaderDecoder(BlockRawHex);

    const decodedBlock = BlockDecoder.decode();
    if (!decodedBlock.transactions) throw new Error("Transaction not found");

    const inscriptionData: inscriptionStoreModel[] = [];

    decodedBlock.transactions.map((e, index) => {
      const txid = e.txid;
      const inputs = e.inputs;
      const outputs = e.output;
      if (e.isCoinBase) return;
      //Now lets see if input contains inscriptions

      const inscriptionInInput = DecodeInputScript(inputs);

      if (inscriptionInInput.length === 0) return;

      const inscriptionOwner = OutputScriptToAddress(outputs[0].script);

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

export default DoginalsIndexer;
