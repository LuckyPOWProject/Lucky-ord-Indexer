import IndexerQuery from "../shared/database/query-indexer";
import Logger from "../shared/system/logger";
import BlockWoker from "./block-indexer/Block-Worker";

const DoginalsIndexer = async () => {
  //Load the indexer data

  Logger.Success(`Starting doginals indexer....`);

  const IndexerStatus = await IndexerQuery.LoadIndexerStatus();

  const IndexBlock = await BlockWoker(IndexerStatus);

  await Promise.all([IndexBlock]);
};

export default DoginalsIndexer;
