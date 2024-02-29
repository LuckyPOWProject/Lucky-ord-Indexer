import { indexingStatus } from "../../types/dogecoin-interface";
import { Decimal } from "decimal.js";
import DogecoinCLI from "../../api/dogecoin-core-rpc/node-connection";
import BlockIndexer from "./Block-Indexer";
import Logger from "../../shared/system/logger";
import SystemConfig from "../../shared/system/config";
import { Sleep } from "../../utils/indexer-utlis";
import IndexerQuery from "../../shared/database/query-indexer";

const BlockWoker = async (indexerStatus: indexingStatus) => {
  let LastSavedBlock = indexerStatus.LastTransactionIndexedBlock;

  let LatestBlock = indexerStatus.LatestBlock;

  while (true) {
    /**
     * Check the latest indexing block status
     */

    if (new Decimal(LastSavedBlock + SystemConfig.blockDiff).gte(LatestBlock)) {
      Logger.Success(`All Blocked Scanned trying to sleep 15sec`);

      const NewLatestBlock = await DogecoinCLI.getLastsynedBlock();

      if (!NewLatestBlock) throw new Error("Faild to get new Block");

      await Sleep(15 * 1000); //sleep 15sec

      if (LatestBlock === NewLatestBlock) continue;

      await IndexerQuery.UpdateLastBlock(NewLatestBlock);

      Logger.Success(`Found new Block Height ${NewLatestBlock}....`);

      LatestBlock = NewLatestBlock;

      continue;
    }

    Logger.Success(`Starting to Index Block from ${LastSavedBlock}....`);

    const NextBlock = await BlockIndexer(LastSavedBlock);

    const { nextBlock } = NextBlock;

    const TotalBlockScanned = nextBlock - LastSavedBlock;

    Logger.Success(
      `Successfuly Indexed Block from ${LastSavedBlock} to ${nextBlock}... Scanned ${TotalBlockScanned} Block`
    );

    LastSavedBlock = nextBlock;
  }
};

export default BlockWoker;
