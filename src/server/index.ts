import express from "express";
import SystemConfig from "../shared/system/config";
import Logger from "../shared/system/logger";
import cors from "cors";
import InscriptionRoute from "./route/inscription-route";
import morgan from "morgan";
import UTXORoute from "./route/utxos";

const App = express();

App.use(cors({ origin: "*" }));
App.use(
  morgan(
    ":method :url :status :res[content-length] - :response-time ms :remote-addr"
  )
);
App.use(InscriptionRoute);
App.use(UTXORoute);

App.listen(SystemConfig.httpPort, () =>
  Logger.Success(`App is running in Port ${SystemConfig.httpPort}`)
);

export default App;
