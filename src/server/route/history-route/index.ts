import { Router } from "express";
import getInscriptionHistory from "./getInscriptionHistory";

const HistoryRoute = Router();

HistoryRoute.get("/history/inscription/:id", (req, res) =>
  getInscriptionHistory(req, res)
);

export default HistoryRoute;
