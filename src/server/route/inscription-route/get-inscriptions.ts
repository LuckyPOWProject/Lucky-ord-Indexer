import { Request, Response } from "express";
import {
  ErrorResponse,
  ServerResponseSuccess,
} from "../../controller/server-response-handler";
import InscriptionhttpQuery from "../../../shared/database/query-http-inscriptions";
import { MultInscriptionResponse } from "../../controller/data-decoder";

const ValidContentType = [
  "all",
  "text",
  "png",
  "jpeg",
  "gif",
  "html",
  "javascript",
  "3d",
  "svg",
  "video",
  "audio",
];
type InscriptionType =
  | "all"
  | "text"
  | "png"
  | "jpeg"
  | "gif"
  | "html"
  | "javascript"
  | "3d"
  | "svg"
  | "video"
  | "audio";

const ContentTypeMatch: Record<InscriptionType, string | string[]> = {
  all: "all",
  text: ["text/plain; charset=utf-8", "text/plain"],
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  html: "text/html; charset=utf-8",
  javascript: "text/javascript",
  "3d": "model/gltf-binary",
  svg: "image/svg+xml",
  video: "video/mp4",
  audio: "audio/mpeg",
};

const getInscriptions = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const offset = Number(req.query.offset) || 0;

    const InscriptionType = (req.query.contentType as InscriptionType) || "all";
    if (isNaN(limit) || isNaN(offset))
      return res.send(ErrorResponse("Invalid Limit or Offset"));

    if (!ValidContentType.includes(InscriptionType))
      return res.send(ErrorResponse("Invalid inscription type"));

    const InscriptionData = await InscriptionhttpQuery.getInscriptions(
      limit,
      offset,
      InscriptionType !== "all" ? ContentTypeMatch[InscriptionType] : undefined
    );

    if (!InscriptionData)
      return res.send(ErrorResponse("Faild to load inscriptions"));

    const DataToServe = await MultInscriptionResponse([
      { Data: InscriptionData },
    ]);

    if (!DataToServe) throw new Error("Faild to serve data");

    const total = await InscriptionhttpQuery.countInscription(
      InscriptionType !== "all" ? ContentTypeMatch[InscriptionType] : undefined
    );

    return res.send(
      ServerResponseSuccess({ total: total, results: DataToServe })
    );
  } catch (error) {
    return res.send(ErrorResponse("Somethings is not working"));
  }
};

export default getInscriptions;
