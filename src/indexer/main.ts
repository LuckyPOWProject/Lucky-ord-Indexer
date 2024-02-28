import BlockIndexer from "./block-indexer/Block-Indexer";
import inscriptionIndex from "./ordinals-inscriptions/Inscription-indexer";

const DoginalsIndexer = async () => {
  let startBlock = 4610731;

  let TotalBlockIndex = 1008;

  let InscriptionFetchingQue = 1000;

  let inscriptionIndexedBlock = 4609723;

  let currentInscriptioNumber = 0;
  while (1) {
    /**
     *
     * Lets index blocks transaction that is required for
     * fetching and indexing the inscriptions...
     *
     */

    if (TotalBlockIndex >= InscriptionFetchingQue) {
      const inscriptionBlockIndexed = await inscriptionIndex(
        inscriptionIndexedBlock,
        startBlock,
        currentInscriptioNumber
      );

      currentInscriptioNumber = inscriptionBlockIndexed.nextInscriptionNumber;

      const BlockLeftToCach =
        startBlock - inscriptionBlockIndexed.nextStartBlock;

      const BlockScanned = TotalBlockIndex - BlockLeftToCach;

      inscriptionIndexedBlock = inscriptionBlockIndexed.nextStartBlock + 1;

      console.log(
        `Inscription Index untill Block:- ${inscriptionIndexedBlock}, Block Scanned:- ${BlockScanned},  Block Left = ${
          TotalBlockIndex - BlockScanned
        }`
      );

      if (BlockScanned === TotalBlockIndex) {
        inscriptionIndexedBlock -= 1;

        TotalBlockIndex = 0;
      }
      continue;
    }

    const NextBlock = await BlockIndexer(startBlock);

    TotalBlockIndex += 12;
    //Update the next block
    console.log(
      `Block Fetched: ${NextBlock - 1}, TotalBlock Scanned: ${TotalBlockIndex}`
    );
    startBlock = NextBlock;
  }
};

export default DoginalsIndexer;
