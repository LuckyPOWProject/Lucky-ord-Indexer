import BlockIndexer from "./block-indexer/Block-Indexer";

const DoginalsIndexer = async () => {
  let startBlock = 4609723;

  let TotalBlockIndex = 0;

  let InscriptionFetchingQue = 14_000; //14k
  while (1) {
    /**
     *
     * Lets index blocks transaction that is required for
     * fetching and indexing the inscriptions...
     *
     */

    if (TotalBlockIndex >= InscriptionFetchingQue) {
      throw "Now Index Inscriptions";
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
