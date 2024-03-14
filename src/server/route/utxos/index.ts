import express, { Request, Response } from "express";
import getInscriptionUTXOs from "./get-inscription-utxos";

const UTXORoute = express.Router();

UTXORoute.get("/unspent/:id", async (req: Request, res: Response) =>
  getInscriptionUTXOs(req, res)
);

export default UTXORoute;
