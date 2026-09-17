export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: { message: string };
}

/** Wraps `data` in the API's success envelope. */
export function ok<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

/** Wraps `message` in the API's error envelope. */
export function fail(message: string): ApiErrorResponse {
  return { success: false, error: { message } };
}
