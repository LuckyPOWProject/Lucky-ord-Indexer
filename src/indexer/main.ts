import IndexerQuery from "../shared/database/query-indexer";
import Logger from "../shared/system/logger";
import BlockWoker from "./block-indexer/Block-Worker";
import inscriptionIndex from "./ordinals-inscriptions/Inscription-indexer";

const DoginalsIndexer = async () => {
  Logger.Success(`Starting doginals indexer....`);
  const IndexerStatus = await IndexerQuery.LoadIndexerStatus();

  const IndexBlock = BlockWoker(IndexerStatus);

  const IndexInscriptions = inscriptionIndex(IndexerStatus);

  await Promise.all([IndexInscriptions,IndexBlock]);
};

export default DoginalsIndexer;
