import InscriptionhttpQuery from "../../shared/database/query-http-inscriptions";
import Logger from "../../shared/system/logger";
import { DataTypes, InscriptionResponseData } from "../../types/http-type";

export const getInscriptionDataDecoded = async (
  e: any
): Promise<boolean | InscriptionResponseData> => {
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
      delegation_txid,
    } = e;

    let contentType = inscription?.contentType;

    if (delegation_txid) {
      const inscription = await InscriptionhttpQuery.getInscription(
        `${delegation_txid}i0`,
        DataTypes.inscription_id
      );
      if (!inscription) return false;

      contentType = inscription.inscription.contentType;
    }

    const Inscription: InscriptionResponseData = {
      id: id,
      owner: owner,
      location: location,
      block: block,
      offset: offset,
      time: time,
      inscriptionNumber: inscriptionNumber,
      txid: txid,
      ...(delegation_txid ? { delegation_id: `${delegation_txid}i0` } : {}),
      contentType: contentType,
    };
    return Inscription;
  } catch (error) {
    Logger.error("Some error occoured while loading inscriptions...");
    return false;
  }
};

export const MultInscriptionResponse = async (data: any[]) => {
  try {
    return await Promise.all(
      data[0].Data.map(async (e: any) => {
        const FormatedData = await getInscriptionDataDecoded(e);
        return FormatedData;
      })
    );
  } catch (error) {
    Logger.error("Some error occoured while loading multi inscriptions...");
    return false;
  }
};
