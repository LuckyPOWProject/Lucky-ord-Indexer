import inscriptionQuery from "../../shared/database/query-inscription";
import {
  inscriptionIncomplete,
  inscriptionStoreModel,
} from "../../types/inscription-interface";

const IndexInscriptions = async (
  data: inscriptionStoreModel[],
  pending: inscriptionIncomplete[],
  invalidInscriptions: Set<string>,
  inscriptionNumberCount: number = 0
) => {
  try {
    const SafeInscriptions: inscriptionStoreModel[] = [];

    for (const inscriptions of data) {
      delete inscriptions.prehash;

      const Location = inscriptions.location;

      if (!inscriptions.id) continue;

      if (invalidInscriptions.has(inscriptions?.id)) {
        continue;
      }

      SafeInscriptions.push({
        ...inscriptions,
        location: Location,
        inscriptionNumber: inscriptionNumberCount,
      });

      inscriptionNumberCount += 1;
    }

    const SafePending: inscriptionIncomplete[] = [];

    for (const pendingInscription of pending) {
      if (invalidInscriptions.has(pendingInscription.id)) {
        continue;
      }

      SafePending.push({ ...pendingInscription });
    }

    const QPromise = [];

    if (SafeInscriptions.length)
      QPromise.push(inscriptionQuery.storeInscription(SafeInscriptions));

    if (SafePending.length)
      QPromise.push(inscriptionQuery.storePendingInscriptions(SafePending));

    await Promise.all(QPromise);

    return inscriptionNumberCount;
  } catch (error) {
    throw error;
  }
};

export default IndexInscriptions;
