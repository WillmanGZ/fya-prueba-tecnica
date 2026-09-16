export interface ServiceInfoDto {
  db_status: "connected" | "unreachable";
  db_time: string | null;
}
