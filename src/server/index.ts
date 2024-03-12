import express from "express";
import SystemConfig from "../shared/system/config";
import Logger from "../shared/system/logger";
import cors from "cors";
import InscriptionRoute from "./route/inscription-route";
import morgan from "morgan";

const App = express();

App.use(cors({ origin: "*" }));
App.use(
  morgan(
    ":method :url :status :res[content-length] - :response-time ms :remote-addr"
  )
);
App.use(InscriptionRoute);

App.listen(SystemConfig.port, () =>
  Logger.Success(`App is running in Port ${SystemConfig.port}`)
);

export default App;
