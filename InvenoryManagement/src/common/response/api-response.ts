export class ApiResponse<T = null> {
  public success: boolean;
  public message: string;
  public data: T | null;

  private constructor(success: boolean, message: string, data: T | null) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static success<T>(data: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse(true, message, data);
  }

  static error<T>(message: string, data: T | null = null): ApiResponse<T | null> {
    return new ApiResponse(false, message, data);
  }
}
