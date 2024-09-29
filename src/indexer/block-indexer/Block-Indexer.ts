/***
 *
 * This module will index block transaction, We will fetch every 12 block
 * in every loop, and when 14k block is indexed then we will start our inscription
 * worker.
 */

import nodeConnection from "../../api/dogecoin-core-rpc/node-connection";
import IndexerQuery from "../../shared/database/query-indexer";
import QueryTransactions from "../../shared/database/query-transaction";
import Logger from "../../shared/system/logger";
import type { Block } from "../../types/dogecoin-interface";
import BlockHeaderDecoder from "../../utils/blockheader-decoder";
import IndexBlockTransaction from "./Index-Block-transaction";
import { ReOrgChecker } from "./reorg-worker";

const BlockIndexer = async (
  startBlock: number,
  maxblock: number
): Promise<{ nextBlock: number }> => {
  await nodeConnection.connect();

  // Block that we want to index every call
  const MaxScan = maxblock;

  /**
   * We will keep the list of block in the array that
   * we are going to fetch from node
   */

  const BlocksToScan = [];

  /**
   * Now let create a array of blocks that we will fetch
   * from node.
   */

  for (let i = 0; i < MaxScan; i++) {
    BlocksToScan.push(startBlock + i);
  }

  /**
   *
   * Check for reorg
   */

  /**
   * Now we create a Promise of block to fetch all the block
   * raw hex to send paraller request to the node in bulk.
   */

  const BlockPromises = await Promise.all(
    BlocksToScan.map(async (e) => {
      const BlockHex = await nodeConnection.getBlockHash(e);
      return { block: BlockHex, number: e };
    })
  );

  /**
   * Some Promise might not full fill so we will only filter the valid
   * Promise,
   */
  const ValidBlockPromises = BlockPromises.filter((a) => a !== undefined);

  //  If there is not any valid data then refetch the block

  if (!ValidBlockPromises.length) {
    await BlockIndexer(startBlock, maxblock);
  }

  await QueryTransactions.InsertBlocks(BlockPromises);

  /**If the Block data responseArray and Block scan array don't
   * fulfill then need to refetch the block
   */

  if (ValidBlockPromises.length !== BlocksToScan.length)
    throw new Error("Block Length and Hex length invalid");

  //  Now lets get the block raw hex data for all the block hash

  const BlockHexData = await Promise.all(
    ValidBlockPromises.map(async (e) => {
      const BlockRawHex: any = await nodeConnection.getBlockHex(e.block);
      return { BlockData: BlockRawHex, Block: e.number };
    })
  );

  const ValidBlockHexData = BlockHexData.filter((a) => a !== undefined).sort(
    (a, b) => a.Block - b.Block
  );

  if (ValidBlockHexData.length !== ValidBlockPromises.length)
    throw new Error("Block Hex Length and Hash length don't match");

  /**
   * Now we decodes the block hex and get all the transaction and block
   * header info that we need for inscriptions
   */

  const DecodeBlockData: Block[] = ValidBlockHexData.map((e) => {
    const BlockDecoder = new BlockHeaderDecoder(e.BlockData);

    const decodedBlock = BlockDecoder.decode(e.Block);

    return decodedBlock;
  });

  /**
   * After decoding the block now just save the block transaction
   * into database.
   */

  if (DecodeBlockData.length === 0) {
    throw new Error("Block decoded return 0 data");
  }

  const PreviousHash = DecodeBlockData[0].blockheader?.previousBlockHash!;
  const PreviousBlockNumber = startBlock - 1;
  if (PreviousBlockNumber > 0)
    await ReOrgChecker({ hash: PreviousHash, height: PreviousBlockNumber });

  const BlockTransaction = await IndexBlockTransaction(DecodeBlockData);

  const NextBlock = BlocksToScan[BlocksToScan.length - 1] + 1;

  Logger.Success("Indexing Blocks Transactions.... ");
  await QueryTransactions.IndexTransactions(BlockTransaction);
  Logger.Success("Indexed Blocks Transactions.... ");

  await IndexerQuery.UpdateLastTransactionIndexedBlock(NextBlock);

  // Now return the new block to start indexing from

  return {
    nextBlock: NextBlock,
  }; //Last block from array
};

export default BlockIndexer;
