import { Request, Response } from "express";
import {
  ErrorResponse,
  ServerResponseSuccess,
} from "../../controller/server-response-handler";
import {
  IsAddressValid,
  ValidateQueryParams,
} from "../../controller/server-helper";
import InscriptionhttpQuery from "../../../shared/database/query-http-inscriptions";
import { MultInscriptionResponse } from "../../controller/data-decoder";
import { DataTypes, dataArray } from "../../../types/http-type";

const getAddressInscriptions = async (req: Request, res: Response) => {
  try {
    const address = req.params.wallet;

    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const IsQueryParamsValid = ValidateQueryParams(limit, offset);

    if (!IsQueryParamsValid) return res.send(ErrorResponse("Invalid Params"));

    const IsAddressDoge = IsAddressValid(address);

    if (!IsAddressDoge) return res.send(ErrorResponse("Invalid Doge Address"));

    const InscriptionForAddress =
      await InscriptionhttpQuery.getInscriptionsForKey(
        address,
        DataTypes.owner,
        limit,
        offset
      );

    if (!InscriptionForAddress)
      return res.send(ErrorResponse("0 Inscription Found "));

    //Now lets make Data Inscription Response format

    const AddressInscriptionsResponse = MultInscriptionResponse(
      InscriptionForAddress
    );

    if (!AddressInscriptionsResponse)
      return res.send(ErrorResponse("Faild to decode inscriptions"));

    const Data: dataArray = {
      result: AddressInscriptionsResponse,
      count: InscriptionForAddress[0].DataCount[0].count,
    };

    return res.send(ServerResponseSuccess(Data));
  } catch (error) {
    return res.send(ErrorResponse("Internal Server Error!"));
  }
};

export default getAddressInscriptions;
