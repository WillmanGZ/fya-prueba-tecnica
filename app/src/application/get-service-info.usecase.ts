import type { InfoRepository } from "../domain/ports/info-repository.port";
import { InfoUnavailableError } from "../domain/errors/info-unavailable.error";
import type { ServiceInfoDto } from "./dto/service-info.dto";

/** Reports whether the configured {@link InfoRepository} (Postgres in production) is reachable. */
export class GetServiceInfoUseCase {
  constructor(private readonly infoRepository: InfoRepository) {}

  /**
   * @returns a {@link ServiceInfoDto} with `db_status: "connected"` and the
   * repository's current time, or `db_status: "unreachable"` if the
   * repository throws {@link InfoUnavailableError}. Any other error propagates.
   */
  async execute(): Promise<ServiceInfoDto> {
    try {
      const now = await this.infoRepository.now();
      return this.toDto("connected", now.toISOString());
    } catch (err) {
      if (err instanceof InfoUnavailableError) {
        return this.toDto("unreachable", null);
      }
      throw err;
    }
  }

  private toDto(dbStatus: ServiceInfoDto["db_status"], dbTime: string | null): ServiceInfoDto {
    return {
      db_status: dbStatus,
      db_time: dbTime,
    };
  }
}
