import { Response, Request } from "express";
import {
  ErrorResponse,
  ServerResponseSuccess,
} from "../../controller/server-response-handler";
import QueryHTTPHistory from "../../../shared/database/query-http-history";

const getInscriptionHistory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const limit = Number(req.params.limit) || 50;

    const offset = Number(req.params.offset) || 0;

    if (isNaN(limit) || isNaN(offset))
      return res.send(ErrorResponse("Invalid Limit or Offset"));

    //fetch history data

    const historyData = await QueryHTTPHistory.getInscriptionHistory(
      id,
      limit,
      offset
    );
    if (!historyData)
      return res.send(ErrorResponse("Faild to get History data"));

    return res.send(
      ServerResponseSuccess(
        historyData.map((e) => {
          return {
            id: e.inscription_id,
            from: e.from,
            to: e.to,
            block: e.block,
            time: e.time,
            txid: e.txid,
          };
        })
      )
    );
  } catch (error) {
    return res.send(ErrorResponse("Somethings went wrong !"));
  }
};

export default getInscriptionHistory;
