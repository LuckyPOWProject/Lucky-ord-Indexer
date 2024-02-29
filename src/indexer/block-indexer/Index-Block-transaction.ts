import { Block, TransactionWithBlock } from "../../types/dogecoin-interface";
const IndexBlockTransaction = async (data: Block[]) => {
  const ArrageBlockTransactionData: TransactionWithBlock[] = [];

  for (const blockData of data.sort((a, b) => a.number - b.number)) {
    const BlockNumber = blockData.number;
    const Transaction = blockData.transactions;
    const BlockHeader = blockData.blockheader;

    if (!BlockHeader?.blocktime)
      throw new Error(`Block time not exist in block ${BlockNumber}`);

    if (!Transaction)
      throw new Error(`Transaction not Found in Block ${BlockNumber}`);

    for (const [i, transactionInfo] of Transaction?.entries()) {
      const TransactionInputs = transactionInfo.inputs;
      const TransactionOutputs = transactionInfo.output;
      const txid = transactionInfo.txid;

      ArrageBlockTransactionData.push({
        index: i,
        time: BlockHeader?.blocktime,
        txid: txid,
        inputs: TransactionInputs,
        outputs: TransactionOutputs,
        blockNumber: BlockNumber,
        coinbase: transactionInfo.isCoinBase,
      });
    }
  }

  return ArrageBlockTransactionData;
};

export default IndexBlockTransaction;
