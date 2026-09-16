export interface InfoRepository {
  /** @throws {InfoUnavailableError} when the underlying data source can't be reached. */
  now(): Promise<Date>;
}
