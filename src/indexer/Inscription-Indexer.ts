import inscriptionQuery from "../shared/database/query-inscription";
import { inscriptionStoreModel } from "../types/inscription-interface";

const IndexInscriptions = async (
  data: inscriptionStoreModel[],
  inscriptionNumberCount: number = 9
) => {
  try {
    const SafeInscriptions: inscriptionStoreModel[] = [];

    const Locations = data.map((e) => e.location);

    //Now we query all the inscription that are in this location

    const LocationMatchedInscription =
      (await inscriptionQuery.LoadMatchLoctionInscriptions(Locations)) || [];

    const MatchedLocationHash = new Set(
      LocationMatchedInscription.map((e) => e.location)
    );

    for (const inscriptions of data) {
      delete inscriptions.prehash;

      const Location = inscriptions.location;

      if (MatchedLocationHash.has(Location)) continue; // in same sats you can't inscribe

      SafeInscriptions.push({
        ...inscriptions,
        inscriptionNumber: inscriptionNumberCount,
      });

      inscriptionNumberCount += 1;
    }
    if (SafeInscriptions.length)
      await inscriptionQuery.storeInscription(SafeInscriptions);

    return inscriptionNumberCount;
  } catch (error) {
    throw error;
  }
};

export default IndexInscriptions;
