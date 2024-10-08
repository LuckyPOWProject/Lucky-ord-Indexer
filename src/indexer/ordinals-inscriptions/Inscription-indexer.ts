import IndexerQuery from "../../shared/database/query-indexer";
import QueryInscriptions from "../../shared/database/query-transaction";
import SystemConfig from "../../shared/system/config";
import Logger from "../../shared/system/logger";
import {
  TransactionWithBlock,
  indexingStatus,
} from "../../types/dogecoin-interface";
import { Sleep } from "../../utils/indexer-utlis";
import IndexInscriptions from "./Index-Valid-Inscriptions";
import inscriptionTransferWork from "./Inscription-transfer-worker";
import inscriptionFetchandStore from "./inscription-fetcher";

const INSC_RANG = SystemConfig.maxscan; // we will index 100 blocks transaction from inscription
const INSC_BEHIND = Number(SystemConfig.blockDiff); // lets add  block behinds

const inscriptionIndex = async (indexerStatus: indexingStatus) => {
  Logger.Success("Starting to index inscription....");
  // max bock scan from database

  let BlockRange = INSC_RANG;

  //Now let gets Transaction for blocks
  let currentInscriptioNumber = indexerStatus.NextInscriptionNumber;

  // block till where the transactions are indexed
  let LastTransactionIndexedBlock = indexerStatus.LastTransactionIndexedBlock;

  //Block till where the inscriptions are indexed
  let LastInscriptionIndexedBlock = indexerStatus.LastInscriptionIndexedBlock;

  //Now lets get the block diffrence

  //Now lets gets all the transaction data for those block

  Logger.Success(
    `Loading indexer status, Last Transaction Block:- ${LastTransactionIndexedBlock}, Last Inscription Block ${LastInscriptionIndexedBlock}`
  );

  while (true) {
    let diffrence = LastTransactionIndexedBlock - LastInscriptionIndexedBlock;

    if (diffrence <= INSC_BEHIND) {
      Logger.Success("Waiting 1 sec before fetching new block...");

      await Sleep(1 * 1000);

      const IndexerStat = await IndexerQuery.LoadIndexerStatus();

      if (
        LastTransactionIndexedBlock === IndexerStat.LastTransactionIndexedBlock
      )
        continue;

      LastTransactionIndexedBlock = IndexerStat.LastTransactionIndexedBlock;

      continue;
    }

    let from = LastInscriptionIndexedBlock; // start block Index

    let to = LastInscriptionIndexedBlock + BlockRange; // end block index

    /**
     * If the block range is less then the min range then
     * just down the max range
     *
     */
    if (diffrence <= INSC_RANG) {
      to = LastInscriptionIndexedBlock + diffrence - INSC_BEHIND;
    }

    Logger.Success(
      `Starting to fetch and index inscription from Block ${from} to ${to}... [Block Behind: ${diffrence}]`
    );

    const Transactions = await QueryInscriptions.LoadTransactions(from, to);

    Logger.Success(`Loaded Transactions.....`);

    if (Transactions.length === 0) {
      throw new Error("Faild to Load Transaction data");
    }

    // Now lets sort transaction data based in block and index,

    const SortedTransactions = Transactions.map((e): TransactionWithBlock => {
      return {
        blockNumber: e.blockNumber,
        time: e.time,
        txid: e.txid,
        index: e.index,
        inputs: e.inputs,
        outputs: e.outputs,
        coinbase: e.coinbase,
      };
    }).sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }
      return a.index - b.index;
    });

    // Now lets fetch the inscription from those transactions

    const FetchInscriptions = await inscriptionFetchandStore(
      SortedTransactions
    );

    Logger.Success(`Fetched inscriptions.....`);

    // Now lets see if there is any inscription transferred in block

    const InscriptionTransfer = await inscriptionTransferWork(
      FetchInscriptions.inscriptions,
      SortedTransactions,
      FetchInscriptions.locations
    );

    if (
      InscriptionTransfer.BlockInscriptions.length ||
      FetchInscriptions.pending.length ||
      InscriptionTransfer.LoctionUpdateInscriptions.length
    ) {
      currentInscriptioNumber = await IndexInscriptions(
        InscriptionTransfer.BlockInscriptions,
        FetchInscriptions.pending,
        InscriptionTransfer.LoctionUpdateInscriptions,
        FetchInscriptions.InscriptionChunks,
        InscriptionTransfer.TransfersHistory,
        InscriptionTransfer.invalidInscriptionsIds,
        currentInscriptioNumber,
        FetchInscriptions.pendingInscriptionToDelete
      );

      await IndexerQuery.UpdateNextInscriptionNumber(currentInscriptioNumber);
    }

    //Next Block to index
    const Next = to + 1;

    Logger.Success(
      `Success fully Indexed inscriptions, Next Start Height ${Next}...`
    );

    //updaing indexer status
    await IndexerQuery.UpdateLastInscriptionIndexedBlock(Next);
    Logger.Success(`Updated indexer states....`);

    LastInscriptionIndexedBlock = Next; ///next bock to start index
  }
};

export default inscriptionIndex;
