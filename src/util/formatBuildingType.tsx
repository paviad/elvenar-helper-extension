import { knownTypeNames } from '../city/Legend/knownTypes';

export const formatBuildingType = (type: string) => {
  return knownTypeNames[type] || type;
};
