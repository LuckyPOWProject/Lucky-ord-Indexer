import { Request, Response } from "express";
import { getInscriptionParms } from "../controller/server-helper";
import InscriptionhttpQuery from "../../shared/database/query-http-inscriptions";
import { ErrorResponse } from "../controller/server-response-handler";
import memetype from "mime-types";
const getInscriptionContent = async (req: Request, res: Response) => {
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

    const InscriptionContentObj = InscriptionData.inscription;

    const contentType = InscriptionContentObj.contentType;
    const content = InscriptionContentObj.data;
    const contentT = memetype.contentType(contentType);
    if (!contentT) return res.send(ErrorResponse("Invalid content type"));
    res.setHeader("Content-Type", contentT);

    return res.send(Buffer.from(content, "hex"));
  } catch (error) {
    return res.send(ErrorResponse("Internal Server Error!"));
  }
};

export default getInscriptionContent;
