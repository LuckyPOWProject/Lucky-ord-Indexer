import { Request, Response } from "express";
import { getInscriptionParms } from "../../controller/server-helper";
import {
  ErrorResponse,
  ServerResponseSuccess,
} from "../../controller/server-response-handler";
import InscriptionhttpQuery from "../../../shared/database/query-http-inscriptions";
import QueryTransactions from "../../../shared/database/query-transaction";

const getInscriptionUTXOs = async (req: Request, res: Response) => {
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

    const { location } = InscriptionData;

    const locationBreaked = (location as string).split(":");

    const Index = locationBreaked[1];
    const txid = locationBreaked[0];

    const TransactionInfo = await QueryTransactions.LoadSingleTransaction(txid);

    if (!TransactionInfo) return res.send(ErrorResponse("Unspent not found !"));

    const UTXOS = [];

    for (const outputs of TransactionInfo.outputs) {
      const index = outputs.index;

      if (index === Number(Index)) {
        UTXOS.push({ ...outputs, txid: txid, vout: outputs.index });
        break;
      }
    }

    return res.send(ServerResponseSuccess(UTXOS));
  } catch (error) {
    return res.send(ErrorResponse("Internal Server Error!"));
  }
};

export default getInscriptionUTXOs;
