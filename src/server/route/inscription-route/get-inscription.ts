import { Request, Response } from "express";
import { getInscriptionParms } from "../../controller/server-helper";
import InscriptionhttpQuery from "../../../shared/database/query-http-inscriptions";
import {
  ErrorResponse,
  ServerResponseSuccess,
} from "../../controller/server-response-handler";
import { getInscriptionDataDecoded } from "../../controller/data-decoder";

export const GetInscription = async (req: Request, res: Response) => {
  try {
    const InscriptionID = req.params.id;

    const InscriptionDataType = getInscriptionParms(InscriptionID);

    if (!InscriptionDataType)
      return res.send(
        ErrorResponse("Invalid params, Required id as string or number")
      );

    const InscriptionData = await InscriptionhttpQuery.getInscription(
      InscriptionID,
      InscriptionDataType
    );

    if (!InscriptionData)
      return res.send(ErrorResponse("Inscription not found!"));

    const InscriptionResponseData = await getInscriptionDataDecoded(
      InscriptionData
    );

    if (!InscriptionResponseData)
      return res.send(ErrorResponse("Faild to decode inscriptions"));

    return res.send(ServerResponseSuccess(InscriptionResponseData));
  } catch (error) {
    return res.send(ErrorResponse("Internal Server Error!"));
  }
};
