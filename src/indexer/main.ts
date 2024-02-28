import IndexerQuery from "../shared/database/query-indexer";
import BlockIndexer from "./block-indexer/Block-Indexer";
import inscriptionIndex from "./ordinals-inscriptions/Inscription-indexer";

const DoginalsIndexer = async () => {
  //Load the indexer data

  const IndexerStatus = await IndexerQuery.LoadIndexerStatus();

  let startBlock = IndexerStatus.LastTransactionIndexedBlock;

  let TotalBlockIndex = IndexerStatus.TotalBlockIndex;

  let InscriptionFetchingQue = 5000; //default

  let inscriptionIndexedBlock = IndexerStatus.LastInscriptionIndexedBlock;

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

      await IndexerQuery.UpdateTotalBlockIndex(TotalBlockIndex - BlockScanned);

      if (BlockScanned === TotalBlockIndex) {
        inscriptionIndexedBlock -= 1;

        TotalBlockIndex = 0;
      }

      await IndexerQuery.UpdateLastInscriptionIndexedBlock(
        inscriptionIndexedBlock
      );
      continue;
    }

    const NextBlock = await BlockIndexer(startBlock);

    await IndexerQuery.UpdateLastTransactionIndexedBlock(NextBlock.nextBlock); //nextstarting block

    TotalBlockIndex = NextBlock.scanRange;

    await IndexerQuery.UpdateTotalBlockIndex(TotalBlockIndex);

    //Update the next block

    startBlock = NextBlock.nextBlock;
  }
};

export default DoginalsIndexer;
