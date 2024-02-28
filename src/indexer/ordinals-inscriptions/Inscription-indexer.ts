import QueryInscriptions from "../../shared/database/query-transaction";
import { TransactionWithBlock } from "../../types/dogecoin-interface";
import IndexInscriptions from "./Index-Valid-Inscriptions";
import inscriptionTransferWork from "./Inscription-transfer-worker";
import inscriptionFetchandStore from "./inscription-fetcher";

const INSC_RANG = 200; // we will index 1000 blocks transaction from inscription

const inscriptionIndex = async (
  startBlock: number,
  endBlock: number,
  currentInscriptioNumber: number
): Promise<{
  nextInscriptionNumber: number;
  nextStartBlock: number;
}> => {
  //Now let gets Transaction for blocks

  let BlockRange = INSC_RANG;

  let From = startBlock;

  let To = INSC_RANG + From;

  const BlockDiffrence = endBlock - startBlock;

  if (BlockDiffrence < BlockRange) {
    BlockRange = BlockDiffrence;
    To = From + BlockDiffrence;
  }

  //Now lets gets all the transaction data for those block

  const Transactions = await QueryInscriptions.LoadTransactions(From, To);

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

  const FetchInscriptions = await inscriptionFetchandStore(SortedTransactions);

  // Now lets see if there is any inscription transferred in block

  const InscriptionTransfer = await inscriptionTransferWork(
    FetchInscriptions.inscriptions,
    SortedTransactions,
    FetchInscriptions.locations
  );

  if (
    InscriptionTransfer.BlockInscriptions.length ||
    FetchInscriptions.pending.length
  ) {
    currentInscriptioNumber = await IndexInscriptions(
      InscriptionTransfer.BlockInscriptions,
      FetchInscriptions.pending,
      InscriptionTransfer.invalidInscriptionsIds,
      currentInscriptioNumber
    );
  }
  return {
    nextInscriptionNumber: currentInscriptioNumber,
    nextStartBlock: To,
  };
};

export default inscriptionIndex;
