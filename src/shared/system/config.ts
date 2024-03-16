import env from "dotenv";

env.config();

const SystemConfig = {
  //Node config
  host: process.env.host || "",
  port: Number(process.env.port) || 22555,
  password: process.env.password || "",
  user: process.env.rpcuser || "",
  mongAuth: process.env.url || "",
  database: process.env.database || "",
  collectionInscription: process.env.collectionInscription || "",
  collectionTransaction: process.env.collectionTransaction || "",
  collectionPendingInscription: process.env.collectionPendingInscription || "",
  collectionIndexer: process.env.collectionIndexer || "",
  collectionBlocks: process.env.collectionBlockNumberToHex || "",
  maxscan: 12,
  startIndex: process.env.startIndex,
  blockDiff: 3,
  //server config
  httpPort: process.env.httpPortServer,
};

export default SystemConfig;
