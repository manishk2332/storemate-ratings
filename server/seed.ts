import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { ratings, stores, users } from "../drizzle/schema";
import { getDb } from "./db";
import { hashPassword } from "./auth";

const demoUsers = [
  { email: "admin@storemate.demo", role: "admin" as const, name: "Aarav Mehta — StoreMate System Administrator", address: "12 Civic Avenue, Bengaluru", password: "Admin@123" },
  { email: "user@storemate.demo", role: "user" as const, name: "Nisha Kapoor — Neighborhood Shopper and Reviewer", address: "48 Market Street, Mumbai", password: "User@123" },
  { email: "owner@storemate.demo", role: "owner" as const, name: "Rohan Shah — Independent Store Owner and Partner", address: "9 Lakeside Road, Pune", password: "Owner@123" },
];

export async function seedDemoData() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required to seed demo data");
  const savedUsers: Record<string, number> = {};
  for (const demo of demoUsers) {
    const existing = await db.select().from(users).where(eq(users.email, demo.email)).limit(1);
    if (existing[0]) {
      savedUsers[demo.role] = existing[0].id;
      continue;
    }
    await db.insert(users).values({ openId: `seed_${nanoid(16)}`, name: demo.name, email: demo.email, passwordHash: hashPassword(demo.password), address: demo.address, role: demo.role, loginMethod: "password" });
    const inserted = await db.select().from(users).where(eq(users.email, demo.email)).limit(1);
    if (inserted[0]) savedUsers[demo.role] = inserted[0].id;
  }
  if (!savedUsers.owner) return;
  const existingStore = await db.select().from(stores).where(eq(stores.ownerId, savedUsers.owner)).limit(1);
  if (!existingStore[0]) {
    await db.insert(stores).values({ name: "Rohan's Corner Market and Daily Goods", email: "hello@rohanscorner.demo", address: "9 Lakeside Road, Pune", ownerId: savedUsers.owner });
  }
  const firstStore = await db.select().from(stores).where(eq(stores.ownerId, savedUsers.owner)).limit(1);
  if (firstStore[0] && savedUsers.user) {
    const existingRating = await db.select().from(ratings).where(eq(ratings.storeId, firstStore[0].id)).limit(1);
    if (!existingRating[0]) await db.insert(ratings).values({ storeId: firstStore[0].id, userId: savedUsers.user, rating: 5 });
  }
  const otherStore = await db.select().from(stores).where(eq(stores.email, "hello@greenlane.demo")).limit(1);
  if (!otherStore[0]) await db.insert(stores).values({ name: "Greenlane Home and Pantry Collective", email: "hello@greenlane.demo", address: "17 Garden Quarter, Bengaluru", ownerId: null });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoData().then(() => console.log("Demo data seeded")).catch(error => { console.error(error); process.exit(1); });
}
