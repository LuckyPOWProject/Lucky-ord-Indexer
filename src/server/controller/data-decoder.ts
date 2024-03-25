import Logger from "../../shared/system/logger";
import { InscriptionResponseData } from "../../types/http-type";

export const getInscriptionDataDecoded = (
  e: any
): InscriptionResponseData | boolean => {
  try {
    const {
      id,
      inscriptionNumber,
      owner,
      offset,
      location,
      block,
      time,
      txid,
      inscription,
    } = e;

    const Inscription: InscriptionResponseData = {
      id: id,
      owner: owner,
      location: location,
      block: block,
      offset: offset,
      time: time,
      inscriptionNumber: inscriptionNumber,
      txid: txid,
      contentType: inscription.contentType,
    };
    return Inscription;
  } catch (error) {
    Logger.error("Some error occoured while loading inscriptions...");
    return false;
  }
};

export const MultInscriptionResponse = (data: any[]) => {
  try {
    return data[0].Data.map((e: any) => {
      const FormatedData = getInscriptionDataDecoded(e);
      return FormatedData;
    });
  } catch (error) {
    Logger.error("Some error occoured while loading multi inscriptions...");
    return false;
  }
};
