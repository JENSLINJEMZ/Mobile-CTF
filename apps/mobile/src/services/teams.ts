import type {
  MyTeamResponse,
  TeamDetailDto,
  TeamMemberRole,
} from "@ctf/shared";

import { api } from "./http";

export interface CreateTeamRequest {
  name: string;
  tagline?: string;
}

export interface JoinTeamRequest {
  joinCode: string;
}

export async function getMyTeam(): Promise<TeamDetailDto | null> {
  const result = await api.get<MyTeamResponse>("/teams/mine", { auth: true });
  return result.team;
}

export async function createTeam(
  body: CreateTeamRequest,
): Promise<TeamDetailDto> {
  return api.post<TeamDetailDto>("/teams", body, { auth: true });
}

export async function joinTeam(body: JoinTeamRequest): Promise<TeamDetailDto> {
  return api.post<TeamDetailDto>("/teams/join", body, { auth: true });
}

export async function updateMemberRole(
  teamId: number,
  userId: number,
  role: TeamMemberRole,
): Promise<TeamDetailDto> {
  return api.patch<TeamDetailDto>(
    `/teams/${teamId}/members/${userId}/role`,
    { role },
    { auth: true },
  );
}

export async function removeMember(
  teamId: number,
  userId: number,
): Promise<TeamDetailDto> {
  return api.del<TeamDetailDto>(`/teams/${teamId}/members/${userId}`, {
    auth: true,
  });
}

export async function deleteTeam(teamId: number): Promise<void> {
  await api.del<void>(`/teams/${teamId}`, { auth: true });
}
