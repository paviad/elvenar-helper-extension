import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';

export function extractElvenarResponse<T>(
  json: ElvenarRequestResponseEntry[],
  requestClass: string,
  requestMethod: string,
): T[] {
  const responses = json.filter((resp) => resp.requestClass === requestClass && resp.requestMethod === requestMethod);
  return responses.map((resp) => resp.responseData as T);
}
