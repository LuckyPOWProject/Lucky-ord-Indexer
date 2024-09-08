import QueryTransactions from "../../shared/database/query-transaction";
import Logger from "../../shared/system/logger";
import { LastBlock } from "../../types/dogecoin-interface";

export const ReOrgChecker = async (lastBlock: LastBlock) => {
  //now let get the lastblock from db

  const lastBlockIndexed = await QueryTransactions.getBlock(lastBlock.height);

  if (!lastBlockIndexed) {
    Logger.error(
      `last Indexed Block not found !, Searching: ${lastBlock.height}`
    );
    process.exit(1);
  }
  if (
    Buffer.from(lastBlock.hash, "hex")
      .reverse()
      .toString("hex")
      .toLowerCase() !== lastBlockIndexed.block.toLowerCase()
  ) {
    Logger.error(`Reorg occour in Block Height ${lastBlock.height}`);
    process.exit(1);
  }
};

export const FixReorg = () => {};
