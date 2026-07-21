// Mirrors com.moduDrive.common.core.web.ApiResponse<T> in ModuDrive-API
export type ApiResponse<T> = {
  status: string
  message: string | null
  data: T
}
