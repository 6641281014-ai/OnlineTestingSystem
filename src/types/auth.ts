export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export interface UserSessionPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentOrTeacherId?: string | null;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: UserSessionPayload;
}
