/** Raised by an {@link InfoRepository} implementation when its data source can't be reached. */
export class InfoUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Info repository is unavailable");
    this.name = "InfoUnavailableError";
    this.cause = cause;
  }
}
