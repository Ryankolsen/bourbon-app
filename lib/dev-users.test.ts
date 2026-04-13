import { DEV_USERS, DEV_PASSWORD, DevUser } from "./dev-users";

describe("DEV_USERS", () => {
  it("exports 11 users (10 test personas + 1 admin)", () => {
    expect(DEV_USERS).toHaveLength(11);
  });

  it("every user has a unique id", () => {
    const ids = DEV_USERS.map((u) => u.id);
    expect(new Set(ids).size).toBe(DEV_USERS.length);
  });

  it("every user has a unique email", () => {
    const emails = DEV_USERS.map((u) => u.email);
    expect(new Set(emails).size).toBe(DEV_USERS.length);
  });

  it("the first entry is the admin (Ryan Kolsen)", () => {
    expect(DEV_USERS[0].name).toBe("Ryan Kolsen");
    expect(DEV_USERS[0].email).toBe("ryankolsen@gmail.com");
    expect(DEV_USERS[0].role).toBe("Admin");
  });

  it("the 10 test personas all have @bourbonvault.dev emails", () => {
    const personas = DEV_USERS.filter((u) => u.email !== "ryankolsen@gmail.com");
    expect(personas).toHaveLength(10);
    personas.forEach((u) => {
      expect(u.email).toMatch(/@bourbonvault\.dev$/);
    });
  });

  it("the 10 test personas all follow the fixed UUID pattern", () => {
    const personas = DEV_USERS.filter((u) => u.email !== "ryankolsen@gmail.com");
    personas.forEach((u) => {
      expect(u.id).toMatch(/^10000000-0000-0000-0000-\d{12}$/);
    });
  });

  it("includes Marcus Webb as the first test persona", () => {
    const marcus = DEV_USERS.find((u) => u.name === "Marcus Webb");
    expect(marcus).toBeDefined();
    expect(marcus!.email).toBe("marcus.webb@bourbonvault.dev");
  });

  it("includes Sadie Okafor as the last test persona", () => {
    const last = DEV_USERS[DEV_USERS.length - 1];
    expect(last.name).toBe("Sadie Okafor");
    expect(last.email).toBe("sadie.okafor@bourbonvault.dev");
  });

  it("every user has a non-empty name and role", () => {
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
