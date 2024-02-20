import DogecoinCore from "../api/dogecoin-core-rpc";
import SystemConfig from "../shared/system/config";
import BlockHeaderDecoder from "../utils/blockheader-decoder";
import inscriptionFetchandStore from "./inscription-fetcher";

const DoginalsIndexer = async () => {
  const DogecoinCLI = new DogecoinCore({
    username: SystemConfig.user,
    password: SystemConfig.password,
    host: SystemConfig.host,
    port: SystemConfig.port,
  });

  await DogecoinCLI.connect();

  let startBlock = 4609723;
  let CurrentInscriptionNumber = 0;

  while (1) {
    const BlockHex = await DogecoinCLI.getBlockHash(startBlock);

    const BlockRawHex: any = await DogecoinCLI.getBlockHex(BlockHex);

    const BlockDecoder = new BlockHeaderDecoder(BlockRawHex);

    const decodedBlock = BlockDecoder.decode();

    const inscriptions = await inscriptionFetchandStore(
      decodedBlock,
      CurrentInscriptionNumber
    );

    //we get new Inscription Number

    CurrentInscriptionNumber += inscriptions;
    startBlock += 1;

    console.log(`scanned block:- ${startBlock}`);
  }
};

export default DoginalsIndexer;
