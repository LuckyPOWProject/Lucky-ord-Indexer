import { Block } from "../types/dogecoin-interface";
import DogecoinCore from "../api/dogecoin-core-rpc";
import SystemConfig from "../shared/system/config";
import BlockHeaderDecoder from "../utils/blockheader-decoder";
import ArrageBlockTransaction from "./arrage-block-transaction";
import inscriptionFetchandStore from "./inscription-fetcher";

const DoginalsIndexer = async () => {
  const DogecoinCLI = new DogecoinCore({
    username: SystemConfig.user,
    password: SystemConfig.password,
    host: SystemConfig.host,
    port: SystemConfig.port,
  });

  await DogecoinCLI.connect();

  let startBlock = 4610171;
  let maxScan = 12;
  let CurrentInscriptionNumber = 0;

  while (1) {
    const BlocksToScan = [];

    for (let i = 0; i < maxScan; i++) {
      BlocksToScan.push(startBlock + i);
    }

    const BlockPromises = await Promise.all(
      BlocksToScan.map(async (e) => {
        const BlockHex = await DogecoinCLI.getBlockHash(e);
        return { block: BlockHex, number: e };
      })
    );

    const ValidBlockHash = BlockPromises.filter((a) => a !== undefined);

    if (ValidBlockHash.length === 0) throw new Error("Faild to get Block hash");

    const BlockHexData = await Promise.all(
      ValidBlockHash.map(async (e) => {
        const BlockRawHex: any = await DogecoinCLI.getBlockHex(e.block);
        return { BlockData: BlockRawHex, Block: e.number };
      })
    );

    const ValidBlockHexData = BlockHexData.filter((a) => a !== undefined);

    if (ValidBlockHexData.length !== ValidBlockHash.length)
      throw new Error("Block Length and Hex length invalid");

    const DecodeBlockData: Block[] = ValidBlockHexData.map((e) => {
      const BlockDecoder = new BlockHeaderDecoder(e.BlockData);

      const decodedBlock = BlockDecoder.decode(e.Block);

      return decodedBlock;
    });

    const ArragedBlockData = ArrageBlockTransaction(DecodeBlockData);

    const inscriptions = await inscriptionFetchandStore(
      ArragedBlockData,
      CurrentInscriptionNumber
    );

    CurrentInscriptionNumber = inscriptions;
    startBlock += 1;

    console.log(`scanned block:- ${startBlock}`);
  }
};

export default DoginalsIndexer;
