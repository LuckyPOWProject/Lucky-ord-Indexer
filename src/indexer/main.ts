import IndexerQuery from "../shared/database/query-indexer";
import Logger from "../shared/system/logger";
import BlockIndexer from "./block-indexer/Block-Indexer";
import inscriptionIndex from "./ordinals-inscriptions/Inscription-indexer";

const DoginalsIndexer = async () => {
  //Load the indexer data

  Logger.Success(`Starting doginals indexer....`);

  const IndexerStatus = await IndexerQuery.LoadIndexerStatus();

  let startBlock = IndexerStatus.LastTransactionIndexedBlock;

  let TotalBlockIndex = IndexerStatus.TotalBlockIndex;

  let InscriptionFetchingQue = 5000; //default

  let inscriptionIndexedBlock = IndexerStatus.LastInscriptionIndexedBlock;

  let currentInscriptioNumber = 0;

  Logger.Success(
    `Indexer Status:- Inscription Fetcher Block :- ${inscriptionIndexedBlock}, Block Fetcher Block:- ${startBlock}`
  );

  while (1) {
    /**
     *
     * Lets index blocks transaction that is required for
     * fetching and indexing the inscriptions...
     *
     */

    if (TotalBlockIndex >= InscriptionFetchingQue) {
      const TimerStart = performance.now();

      Logger.Success(
        `Starting to index inscription from block ${inscriptionIndexedBlock} to ${
          startBlock - TotalBlockIndex
        }`
      );

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
      const TimerEnd = performance.now();

      const TimeTaken = ((TimerEnd - TimerStart) / 60).toFixed(3);

      Logger.Success(
        `Successfully indexed Inscription untill block ${inscriptionIndexedBlock}. Took ${TimeTaken} sec...`
      );

      Logger.Success(
        `Out of ${TotalBlockIndex}, ${BlockScanned} blocks has been scanned`
      );

      await IndexerQuery.UpdateLastInscriptionIndexedBlock(
        inscriptionIndexedBlock
      );
      continue;
    }
    const TimerStart = performance.now();

    Logger.Success(`Indexing Block Transaction from ${startBlock}....`);

    const NextBlock = await BlockIndexer(startBlock);

    Logger.Success(`Updating block state `);

    await IndexerQuery.UpdateLastTransactionIndexedBlock(NextBlock.nextBlock); //nextstarting block

    TotalBlockIndex += NextBlock.scanRange;

    await IndexerQuery.UpdateTotalBlockIndex(TotalBlockIndex);

    const TimerEnd = performance.now();

    const TimeTaken = ((TimerEnd - TimerStart) / 60).toFixed(3);

    //Update the next block
    Logger.Success(
      `Successfully Index Block till ${NextBlock.nextBlock}. Took ${TimeTaken} sec...`
    );

    startBlock = NextBlock.nextBlock;
  }
};

export default DoginalsIndexer;
