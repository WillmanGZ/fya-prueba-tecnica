export interface ServiceInfoDto {
  status: "ok" | "error";
  db_status: "connected" | "unreachable";
  db_time: string | null;
}
