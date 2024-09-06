import inscriptionQuery from "../../shared/database/query-inscription";
import {
  InscriptionChunks,
  inscriptionIncomplete,
  inscriptionStoreModel,
  inscriptionTransfer,
  LoctionUpdates,
} from "../../types/inscription-interface";

const IndexInscriptions = async (
  data: inscriptionStoreModel[],
  pending: inscriptionIncomplete[],
  LocationUpdateInscription: LoctionUpdates[],
  inscriptionChunks: InscriptionChunks[],
  TransfersHistory: inscriptionTransfer[],
  invalidInscriptions: Set<string>,
  inscriptionNumberCount: number = 0,
  pendinginscriptionsToDelete: string[]
) => {
  try {
    const SafeInscriptions: inscriptionStoreModel[] = [];

    for (const inscriptions of data) {
      delete inscriptions.prehash;

      const Location = inscriptions.location;

      if (!inscriptions.id) continue;

      if (invalidInscriptions.has(inscriptions?.id)) {
        if (inscriptions.inscription?.data === "chunk") {
          await inscriptionQuery.deleteInscriptionChunks(inscriptions.id);
        }
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

    if (LocationUpdateInscription.length) {
      QPromise.push(
        inscriptionQuery.UpdateInscriptionLocation(LocationUpdateInscription)
      );
    }

    if (TransfersHistory.length) {
      QPromise.push(
        inscriptionQuery.storeInscriptionTransferHistory(TransfersHistory)
      );
    }

    if (inscriptionChunks.length) {
      QPromise.push(inscriptionQuery.storeInscriptionChunks(inscriptionChunks));
    }

    if (pendinginscriptionsToDelete.length) {
      QPromise.push(
        inscriptionQuery.deletePendingInscriptionsBulk(
          pendinginscriptionsToDelete
        )
      );
    }

    await Promise.all(QPromise);

    return inscriptionNumberCount;
  } catch (error) {
    throw error;
  }
};

export default IndexInscriptions;
