import env from "dotenv";

env.config();

const SystemConfig = {
  //Node config
  host: process.env.host || "",
  port: Number(process.env.port) || 22555,
  password: process.env.password || "",
  user: process.env.username || "",

  mongAuth: process.env.url || "",
  database: process.env.database || "",
  collectionInscription: process.env.collectionInscription || "",
  collectionTransaction: process.env.collectionTransaction || "",
  collectionPendingInscription: process.env.collectionPendingInscription || "",
  maxscan: 12,
};

export default SystemConfig;
