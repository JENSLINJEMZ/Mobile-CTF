import { prisma } from "@ctf/database";
import type { TeamDetailDto, TeamDto } from "@ctf/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app";

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let serial = 0;
function uniqueEmail(tag: string): string {
  serial += 1;
  return `tm-${tag}-${runSuffix}-${serial}@example.com`;
}
function uniqueUsername(tag: string): string {
  serial += 1;
  return `tm${tag}${serial}-${runSuffix.slice(-6)}`;
}
function uniqueTeamName(tag: string): string {
  serial += 1;
  return `Team ${tag} ${serial}-${runSuffix.slice(-6)}`;
}

async function register(
  tag: string,
): Promise<{ token: string; userId: number; username: string }> {
  const username = uniqueUsername(tag);
  const res = await api.post("/api/auth/register").send({
    email: uniqueEmail(tag),
    username,
    password: "password123",
  });
  expect(res.status).toBe(201);
  const body = res.body.data as {
    user: { id: number; username: string };
    tokens: { accessToken: string };
  };
  return {
    token: body.tokens.accessToken,
    userId: body.user.id,
    username: body.user.username,
  };
}

async function createTeam(token: string, name: string): Promise<TeamDetailDto> {
  const res = await api
    .post("/api/teams")
    .set("Authorization", `Bearer ${token}`)
    .send({ name })
    .expect(201);
  return res.body.data as TeamDetailDto;
}

beforeAll(async () => {
  serial = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("teams API", () => {
  it("creates a team with the creator as leader", async () => {
    const { token, userId } = await register("A");
    const team = await createTeam(token, uniqueTeamName("alpha"));

    expect(team.memberCount).toBe(1);
    expect(team.myRole).toBe("LEADER");
    expect(team.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(team.members).toHaveLength(1);
    expect(team.members[0]?.userId).toBe(userId);
    expect(team.members[0]?.role).toBe("LEADER");
  });

  it("returns null for /teams/mine when the user has no team", async () => {
    const { token } = await register("B");
    const res = await api
      .get("/api/teams/mine")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toBeNull();
  });

  it("allows another user to join via the join code", async () => {
    const a = await register("C");
    const b = await register("D");
    const team = await createTeam(a.token, uniqueTeamName("beta"));

    const res = await api
      .post("/api/teams/join")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ joinCode: team.joinCode })
      .expect(200);
    const joined = res.body.data as TeamDetailDto;
    expect(joined.memberCount).toBe(2);
    expect(
      joined.members.some((m) => m.userId === b.userId && m.role === "MEMBER"),
    ).toBe(true);
  });

  it("hides the join code from non-members", async () => {
    const a = await register("E");
    const outsider = await register("F");
    const team = await createTeam(a.token, uniqueTeamName("gamma"));

    const res = await api.get(`/api/teams/${team.id}`).expect(200);
    const viewed = res.body.data as TeamDetailDto;
    expect(viewed.joinCode).toBeNull();

    await api
      .post("/api/teams/join")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ joinCode: team.joinCode })
      .expect(200);

    const mine = await api
      .get("/api/teams/mine")
      .set("Authorization", `Bearer ${outsider.token}`)
      .expect(200);
    const myTeam = mine.body.data as TeamDetailDto;
    expect(myTeam.joinCode).toBe(team.joinCode);
  });

  it("enforces one team per user", async () => {
    const a = await register("G");
    const b = await register("H");
    const teamOne = await createTeam(a.token, uniqueTeamName("delta"));
    await api
      .post("/api/teams/join")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ joinCode: teamOne.joinCode })
      .expect(200);

    const teamTwoLeader = await register("I");
    const teamTwo = await createTeam(
      teamTwoLeader.token,
      uniqueTeamName("epsilon"),
    );
    const res = await api
      .post("/api/teams/join")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ joinCode: teamTwo.joinCode })
      .expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects unknown join codes", async () => {
    const b = await register("J");
    const res = await api
      .post("/api/teams/join")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ joinCode: "ZZZZZZ" })
      .expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects joining a team that is full", async () => {
    const leader = await register("K");
    const team = await createTeam(leader.token, uniqueTeamName("zeta"));

    for (let i = 0; i < 4; i += 1) {
      const member = await register("M");
      const res = await api
        .post("/api/teams/join")
        .set("Authorization", `Bearer ${member.token}`)
        .send({ joinCode: team.joinCode })
        .expect(200);
      expect((res.body.data as TeamDetailDto).memberCount).toBe(i + 2);
    }

    const straggler = await register("N");
    const res = await api
      .post("/api/teams/join")
      .set("Authorization", `Bearer ${straggler.token}`)
      .send({ joinCode: team.joinCode })
      .expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("only lets the leader invite, and accepts only the invitee via invite code", async () => {
    const a = await register("O");
    const b = await register("P");
    const c = await register("Q");
    const team = await createTeam(a.token, uniqueTeamName("eta"));

    const forbidden = await api
      .post(`/api/teams/${team.id}/invites`)
      .set("Authorization", `Bearer ${c.token}`)
      .send({ username: b.username })
      .expect(403);

    const res = await api
      .post(`/api/teams/${team.id}/invites`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ username: b.username })
      .expect(201);
    const inviteCode = (res.body.data as { inviteCode: string }).inviteCode;

    const wrongPerson = await api
      .post("/api/teams/invites/accept")
      .set("Authorization", `Bearer ${c.token}`)
      .send({ inviteCode })
      .expect(403);

    void forbidden;
    void wrongPerson;

    const accepted = await api
      .post("/api/teams/invites/accept")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ inviteCode })
      .expect(200);
    const teamAfter = accepted.body.data as TeamDetailDto;
    expect(teamAfter.memberCount).toBe(2);
    expect(teamAfter.members.some((m) => m.userId === b.userId)).toBe(true);
  });

  it("manages roles: promote, demote, and guard the last leader", async () => {
    const a = await register("R");
    const b = await register("S");
    const team = await createTeam(a.token, uniqueTeamName("theta"));
    await api
      .post("/api/teams/join")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ joinCode: team.joinCode })
      .expect(200);

    const promoted = await api
      .patch(`/api/teams/${team.id}/members/${b.userId}`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ role: "LEADER" })
      .expect(200);
    expect(
      (promoted.body.data as TeamDetailDto).members.find(
        (m) => m.userId === b.userId,
      )?.role,
    ).toBe("LEADER");

    const demoted = await api
      .patch(`/api/teams/${team.id}/members/${a.userId}`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ role: "MEMBER" })
      .expect(200);
    expect(
      (demoted.body.data as TeamDetailDto).members.find(
        (m) => m.userId === a.userId,
      )?.role,
    ).toBe("MEMBER");

    const bNotLeader = await api
      .post(`/api/teams/${team.id}/invites`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ username: uniqueUsername("X") })
      .expect(403);
    void bNotLeader;

    await api
      .patch(`/api/teams/${team.id}/members/${b.userId}`)
      .set("Authorization", `Bearer ${b.token}`)
      .send({ role: "MEMBER" })
      .expect(409);
  });

  it("removes members and disbands single-member teams", async () => {
    const a = await register("T");
    const b = await register("U");
    const team = await createTeam(a.token, uniqueTeamName("iota"));
    await api
      .post("/api/teams/join")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ joinCode: team.joinCode })
      .expect(200);

    await api
      .delete(`/api/teams/${team.id}/members/${b.userId}`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    const disband = await api
      .delete(`/api/teams/${team.id}/members/${a.userId}`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);
    expect((disband.body.data as { disbanded: boolean }).disbanded).toBe(true);

    const mine = await api
      .get("/api/teams/mine")
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);
    expect(mine.body.data).toBeNull();
  });

  it("deletes the team as leader", async () => {
    const a = await register("V");
    const team = await createTeam(a.token, uniqueTeamName("kappa"));
    await api
      .delete(`/api/teams/${team.id}`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    const mine = await api
      .get("/api/teams/mine")
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);
    expect(mine.body.data).toBeNull();
  });

  it("lists teams and supports search", async () => {
    const a = await register("W");
    const name = uniqueTeamName("lambda-searchable");
    const team = await createTeam(a.token, name);

    const res = await api.get("/api/teams").expect(200);
    expect((res.body.data as TeamDto[]).some((t) => t.id === team.id)).toBe(
      true,
    );

    const search = await api
      .get(`/api/teams?search=${encodeURIComponent(name.slice(3, 12))}`)
      .expect(200);
    expect((search.body.data as TeamDto[]).some((t) => t.id === team.id)).toBe(
      true,
    );
  });
});
