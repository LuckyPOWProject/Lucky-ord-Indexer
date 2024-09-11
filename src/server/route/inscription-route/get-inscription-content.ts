import { Request, Response } from "express";
import { getInscriptionParms } from "../../controller/server-helper";
import InscriptionhttpQuery from "../../../shared/database/query-http-inscriptions";
import { ErrorResponse } from "../../controller/server-response-handler";
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

    let contentType = InscriptionContentObj?.contentType;
    let content = InscriptionContentObj?.data as string;

    const delegation_id = InscriptionData.delegation_txid;

    let content_;
    if (delegation_id) {
      //load inscription

      const inscription = await InscriptionhttpQuery.getInscription(
        `${delegation_id}i0`,
        InscriptionDataType
      );

      if (!inscription) throw new Error("delegation_id not found");

      content_ = await LoadContent(
        inscription.inscription.data as string,
        `${delegation_id}i0`
      );
      contentType = inscription.inscription.contentType;
    } else {
      content_ = await LoadContent(content, InscriptionID);
    }

    const contentT = memetype.contentType(contentType);

    if (!contentT) return res.send(ErrorResponse("Invalid content type"));

    res.setHeader("Content-Type", content_!);

    return res.send(Buffer.from(content_, "hex"));
  } catch (error) {
    console.log(error);
    return res.send(ErrorResponse("Internal Server Error!"));
  }
};

export default getInscriptionContent;

const LoadContent = async (content: string, InscriptionID: string) => {
  if (content === "chunks") {
    //load chunks

    const chunksData = await InscriptionhttpQuery.getChunksContent(
      InscriptionID
    );

    if (!chunksData) return "";

    content = "";
    for (const chunk of chunksData) {
      content += chunk.data;
    }
    return content;
  }
  return content;
};
