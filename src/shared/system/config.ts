import env from "dotenv";

env.config();

const SystemConfig = {
  //Node config
  host: process.env.host || "",
  port: Number(process.env.port) || 22555,
  password: process.env.password || "",
  user: process.env.username || "",
};

export default SystemConfig;
