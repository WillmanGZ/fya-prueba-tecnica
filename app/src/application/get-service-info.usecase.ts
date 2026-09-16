import type { InfoRepository } from "../domain/ports/info-repository.port";
import { InfoUnavailableError } from "../domain/errors/info-unavailable.error";
import type { ServiceInfoDto } from "./dto/service-info.dto";

export class GetServiceInfoUseCase {
  constructor(private readonly infoRepository: InfoRepository) {}

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
      status: dbStatus === "connected" ? "ok" : "error",
      db_status: dbStatus,
      db_time: dbTime,
    };
  }
}
