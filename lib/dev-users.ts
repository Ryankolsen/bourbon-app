/**
 * Static list of seeded test personas for local development.
 * Matches UUIDs and emails in supabase/seed.sql.
 * All share password: BourbonDev2024!
 */

export interface DevUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const DEV_PASSWORD = "BourbonDev2024!";

export const DEV_USERS: DevUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000099",
    name: "Ryan Kolsen",
    email: "ryankolsen@gmail.com",
    role: "Admin",
  },
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Marcus Webb",
    email: "marcus.webb@bourbonvault.dev",
    role: "Owner, The Barrel Room",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "Diana Chen",
    email: "diana.chen@bourbonvault.dev",
    role: "Member, The Barrel Room",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    name: "Tobias Grant",
    email: "tobias.grant@bourbonvault.dev",
    role: "Member, The Barrel Room",
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    name: "Priya Nair",
    email: "priya.nair@bourbonvault.dev",
    role: "Member, The Barrel Room",
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    name: "Logan Steele",
    email: "logan.steele@bourbonvault.dev",
    role: "Member, The Barrel Room",
  },
  {
    id: "10000000-0000-0000-0000-000000000006",
    name: "Celeste Morrow",
    email: "celeste.morrow@bourbonvault.dev",
    role: "Owner, Whiskey Underground",
  },
  {
    id: "10000000-0000-0000-0000-000000000007",
    name: "Finn Callahan",
    email: "finn.callahan@bourbonvault.dev",
    role: "Member, Whiskey Underground",
  },
  {
    id: "10000000-0000-0000-0000-000000000008",
    name: "Ava Drummond",
    email: "ava.drummond@bourbonvault.dev",
    role: "Member, Whiskey Underground",
  },
  {
    id: "10000000-0000-0000-0000-000000000009",
    name: "Jonah Rivera",
    email: "jonah.rivera@bourbonvault.dev",
    role: "Solo user",
  },
  {
    id: "10000000-0000-0000-0000-000000000010",
    name: "Sadie Okafor",
    email: "sadie.okafor@bourbonvault.dev",
    role: "Solo user",
  },
];
