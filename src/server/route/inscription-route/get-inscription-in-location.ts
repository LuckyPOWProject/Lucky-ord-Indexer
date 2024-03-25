import { Request, Response } from "express";
import {
  ErrorResponse,
  ServerResponseSuccess,
} from "../../controller/server-response-handler";
import InscriptionhttpQuery from "../../../shared/database/query-http-inscriptions";
import { DataTypes, dataArray } from "../../../types/http-type";
import {
  MultInscriptionResponse,
  getInscriptionDataDecoded,
} from "../../controller/data-decoder";
import { ValidateQueryParams } from "../../controller/server-helper";

const GetInscriptionInLocation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const limit = Number(req.params.limit) || 50;
    const offset = Number(req.params.offset) || 0;

    const IsQueryParamsValid = ValidateQueryParams(limit, offset);
    if (!IsQueryParamsValid) return res.send(ErrorResponse("Invalid Params"));

    const LocationBreaked = id.split(":").length === 2;

    if (!LocationBreaked)
      return res.send(ErrorResponse("Invalid Location Type !"));

    //Now lets get inscription in that location

    const InscriptionData = await InscriptionhttpQuery.getInscriptionsForKey(
      id,
      DataTypes.location,
      limit,
      offset
    );

    if (!InscriptionData)
      return res.send(ErrorResponse("0 Inscription  found!"));

    const InscriptionResponseData = MultInscriptionResponse(InscriptionData);

    if (!InscriptionResponseData)
      return res.send(ErrorResponse("Faild to decode inscriptions"));

    const Data: dataArray = {
      result: InscriptionResponseData,
      count: InscriptionData[0].DataCount[0].count,
    };

    return res.send(ServerResponseSuccess(Data));
  } catch (error) {
    return res.send(ErrorResponse("Internal Server Error!"));
  }
};

export default GetInscriptionInLocation;
