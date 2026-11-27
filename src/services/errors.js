// FILE: src/services/errors.js
export class ApiError extends Error {
  constructor(status, body = {}) {
    super(body.error || body.message || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body; // với 409: body.conversation là trạng thái hiện tại
  }
}

export function isNetworkOrTimeoutError(err) {
  if (!err) return false;
  if (err instanceof ApiError) {
    return err.status === 408 || err.status === 502 || err.status === 503 || err.status === 504;
  }
  return err.name === "TypeError" || err.name === "AbortError" || /network|timeout|fetch/i.test(err.message || "");
}
