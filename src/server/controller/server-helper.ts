import Decimal from "decimal.js";
import { DataTypes } from "../../types/http-type";

enum LengthOfDatas {
  InscriptionIdLength = 66,
  addressLength = 34,
}

export const getInscriptionParms = (id: string) => {
  if (id.length === LengthOfDatas.InscriptionIdLength) {
    return DataTypes.inscription_id;
  } else if (typeof Number(id) === "number" && !Number.isNaN(Number(id))) {
    return DataTypes.inscriptionNumber;
  } else {
    return false;
  }
};

export const IsAddressValid = (address: string) => {
  if (address.length !== LengthOfDatas.addressLength) return false;
  return true;
};

export const ValidateQueryParams = (limit: number, offset: number) => {
  try {
    const LimitDecimal = new Decimal(limit);
    const offsetDecimal = new Decimal(offset);
    if (
      LimitDecimal.isNaN() ||
      LimitDecimal.isNeg() ||
      LimitDecimal.isZero() ||
      offsetDecimal.isNeg() ||
      offsetDecimal.isNaN() ||
      LimitDecimal.gt(1_000)
    )
      return false;

    return true;
  } catch (error) {
    return false;
  }
};
