import { DEV_USERS, DEV_PASSWORD, DevUser } from "./dev-users";

describe("DEV_USERS", () => {
  it("exports exactly 10 personas", () => {
    expect(DEV_USERS).toHaveLength(10);
  });

  it("every persona has a unique id", () => {
    const ids = DEV_USERS.map((u) => u.id);
    expect(new Set(ids).size).toBe(10);
  });

  it("every persona has a unique email", () => {
    const emails = DEV_USERS.map((u) => u.email);
    expect(new Set(emails).size).toBe(10);
  });

  it("all emails are @bourbonvault.dev", () => {
    DEV_USERS.forEach((u) => {
      expect(u.email).toMatch(/@bourbonvault\.dev$/);
    });
  });

  it("all IDs follow the fixed UUID pattern", () => {
    DEV_USERS.forEach((u) => {
      expect(u.id).toMatch(/^10000000-0000-0000-0000-\d{12}$/);
    });
  });

  it("includes Marcus Webb as the first persona", () => {
    expect(DEV_USERS[0].name).toBe("Marcus Webb");
    expect(DEV_USERS[0].email).toBe("marcus.webb@bourbonvault.dev");
  });

  it("includes Sadie Okafor as the last persona", () => {
    const last = DEV_USERS[DEV_USERS.length - 1];
    expect(last.name).toBe("Sadie Okafor");
    expect(last.email).toBe("sadie.okafor@bourbonvault.dev");
  });

  it("every persona has a non-empty name and role", () => {
    DEV_USERS.forEach((u: DevUser) => {
      expect(u.name.trim()).not.toBe("");
      expect(u.role.trim()).not.toBe("");
    });
  });
});

describe("DEV_PASSWORD", () => {
  it("is the shared test password", () => {
    expect(DEV_PASSWORD).toBe("BourbonDev2024!");
  });
});
