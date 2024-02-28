import inscriptionQuery from "../../shared/database/query-inscription";
import {
  inscriptionIncomplete,
  inscriptionStoreModel,
} from "../../types/inscription-interface";

const IndexInscriptions = async (
  data: inscriptionStoreModel[],
  pending: inscriptionIncomplete[],
  invalidInscriptions: Set<string>,
  inscriptionNumberCount: number = 9
) => {
  try {
    const SafeInscriptions: inscriptionStoreModel[] = [];
    const IgnoredInscriptions: any[] = [];

    for (const inscriptions of data) {
      delete inscriptions.prehash;

      const Location = inscriptions.location;

      if (!inscriptions.id) continue;

      if (invalidInscriptions.has(inscriptions?.id)) {
        IgnoredInscriptions.push({
          id: inscriptions.id,
          step: 2,
          location: inscriptions.location,
        });
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
    const LocationsPending = pending.map((e) => e.location);

    const LocationMatchedInscriptionPending =
      (await inscriptionQuery.LoadMatchLoctionInscriptions(LocationsPending)) ||
      [];

    const MatchedLocationHashPending = new Set(
      LocationMatchedInscriptionPending.map((e) => e.location)
    );

    for (const pendingInscription of pending) {
      const Location = pendingInscription.location;

      if (MatchedLocationHashPending.has(Location)) {
        IgnoredInscriptions.push({ id: pendingInscription.id, step: 3 });

        continue;
      } // in same sats you can't inscribe

      if (invalidInscriptions.has(pendingInscription.id)) {
        IgnoredInscriptions.push({ id: pendingInscription.id, step: 4 });
        continue;
      }

      SafePending.push({ ...pendingInscription });
    }

    const QPromise = [];

    if (SafeInscriptions.length)
      QPromise.push(inscriptionQuery.storeInscription(SafeInscriptions));

    if (SafePending.length)
      QPromise.push(inscriptionQuery.storePendingInscriptions(SafePending));

    if (IgnoredInscriptions.length) {
      QPromise.push(
        inscriptionQuery.PushIgnoredInscription(IgnoredInscriptions)
      );
    }

    await Promise.all(QPromise);

    return inscriptionNumberCount;
  } catch (error) {
    throw error;
  }
};

export default IndexInscriptions;
