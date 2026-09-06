import type {
  AuthResponse,
  ForgotPasswordResponse,
  LogoutResponse,
  UserDto,
} from "@ctf/shared";

import { api } from "./http";

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/register", input);
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", input);
}

export async function fetchMe(): Promise<UserDto> {
  return api.get<UserDto>("/auth/me", { auth: true });
}

export async function logoutAll(): Promise<LogoutResponse> {
  return api.post<LogoutResponse>("/auth/logout-all", undefined, {
    auth: true,
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<ForgotPasswordResponse> {
  return api.post<ForgotPasswordResponse>("/auth/forgot-password", { email });
}
