export type TeamMemberRole = "LEADER" | "MEMBER";

export interface TeamMemberDto {
  userId: number;
  username: string;
  role: TeamMemberRole;
  joinedAt: string;
}

export interface TeamDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
}

export interface TeamDetailDto extends TeamDto {
  joinCode: string | null;
  members: TeamMemberDto[];
  myRole: TeamMemberRole | null;
}

export interface MyTeamResponse {
  team: TeamDetailDto | null;
}
