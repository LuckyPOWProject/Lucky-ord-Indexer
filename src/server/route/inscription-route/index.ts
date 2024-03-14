import express from "express";
import { GetInscription } from "./get-inscription";
import getAddressInscriptions from "./get-address-inscriptions";
import getInscriptionContent from "./get-inscription-content";

const InscriptionRoute = express.Router();

InscriptionRoute.get(`/inscription/:id`, async (req, res) =>
  GetInscription(req, res)
);

InscriptionRoute.get("/address/:wallet", async (req, res) =>
  getAddressInscriptions(req, res)
);

InscriptionRoute.get("/content/:id", async (req, res) =>
  getInscriptionContent(req, res)
);

export default InscriptionRoute;
