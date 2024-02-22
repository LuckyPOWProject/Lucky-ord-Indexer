import inscriptionQuery from "../shared/database/query-inscription";
import { inscriptionStoreModel } from "../types/inscription-interface";

const IndexInscriptions = async (
  data: inscriptionStoreModel[],
  inscriptionNumberCount: number = 9
) => {
  try {
    const SafeInscriptions: inscriptionStoreModel[] = [];

    for (const inscriptions of data) {
      delete inscriptions.prehash;

      SafeInscriptions.push({
        ...inscriptions,
        inscriptionNumber: inscriptionNumberCount,
      });

      inscriptionNumberCount += 1;
    }

    //    await inscriptionQuery.storeInscription(SafeInscriptions);

    return inscriptionNumberCount;
  } catch (error) {
    throw error;
  }
};

export default IndexInscriptions;
