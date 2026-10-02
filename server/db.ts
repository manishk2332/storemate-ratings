import { and, asc, count, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ratings, stores, users, type AppRole, type InsertStore, type InsertUser } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function requireDb<T>(db: T | null): T {
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createUser(input: Omit<InsertUser, "id" | "createdAt" | "updatedAt" | "lastSignedIn">) {
  const db = requireDb(await getDb());
  await db.insert(users).values({
    ...input,
    email: input.email.toLowerCase(),
    lastSignedIn: new Date(),
  });
  return getUserByOpenId(input.openId);
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = requireDb(await getDb());
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function markUserSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function upsertUser(user: Pick<InsertUser, "openId"> & Partial<InsertUser>): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = requireDb(await getDb());
  const values: InsertUser = {
    ...user,
    name: user.name ?? "Platform User",
    email: user.email?.toLowerCase() ?? `${user.openId}@platform.local`,
    address: user.address ?? "",
    loginMethod: user.loginMethod ?? "manus",
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  const updateSet: Partial<InsertUser> = { lastSignedIn: values.lastSignedIn };
  if (user.name !== undefined) updateSet.name = user.name;
  if (user.email !== undefined) updateSet.email = user.email.toLowerCase();
  if (user.address !== undefined) updateSet.address = user.address;
  if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod;
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: updateSet,
  });
}

const userSortColumns = {
  name: users.name,
  email: users.email,
  address: users.address,
  role: users.role,
  createdAt: users.createdAt,
} as const;

const storeSortColumns = {
  name: stores.name,
  email: stores.email,
  address: stores.address,
  createdAt: stores.createdAt,
} as const;

const ownerRatingSortColumns = {
  name: users.name,
  email: users.email,
  address: users.address,
  rating: ratings.rating,
  submittedAt: ratings.updatedAt,
} as const;

type SortDirection = "asc" | "desc";

export async function getDashboardCounts() {
  const db = requireDb(await getDb());
  const [userRows, storeRows, ratingRows] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(stores),
    db.select({ value: count() }).from(ratings),
  ]);
  return {
    users: Number(userRows[0]?.value ?? 0),
    stores: Number(storeRows[0]?.value ?? 0),
    ratings: Number(ratingRows[0]?.value ?? 0),
  };
}

export async function listUsers(input: {
  search?: string;
  address?: string;
  role?: AppRole;
  page: number;
  pageSize: number;
  sortBy: keyof typeof userSortColumns;
  sortDirection: SortDirection;
  includeOwners?: boolean;
}) {
  const db = requireDb(await getDb());
  const clauses = [];
  const search = input.search?.trim();
  if (search) {
    clauses.push(or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)));
  }
  if (input.address?.trim()) clauses.push(like(users.address, `%${input.address.trim()}%`));
  if (input.role) clauses.push(eq(users.role, input.role));
  if (!input.includeOwners && input.role !== "owner") clauses.push(inArray(users.role, ["user", "admin"]));
  const where = clauses.length ? and(...clauses) : undefined;
  const offset = (input.page - 1) * input.pageSize;
  const orderColumn = userSortColumns[input.sortBy] ?? users.name;
  const rows = await db.select().from(users).where(where).orderBy(input.sortDirection === "desc" ? desc(orderColumn) : asc(orderColumn)).limit(input.pageSize).offset(offset);
  const totalRows = await db.select({ value: count() }).from(users).where(where);
  return { rows, total: Number(totalRows[0]?.value ?? 0) };
}

export async function listStores(input: {
  search?: string;
  storeId?: number;
  page: number;
  pageSize: number;
  sortBy: keyof typeof storeSortColumns | "rating";
  sortDirection: SortDirection;
}) {
  const db = requireDb(await getDb());
  const search = input.search?.trim();
  const clauses = [];
  if (search) clauses.push(or(like(stores.name, `%${search}%`), like(stores.address, `%${search}%`), like(stores.email, `%${search}%`)));
  if (input.storeId) clauses.push(eq(stores.id, input.storeId));
  const where = clauses.length ? and(...clauses) : undefined;
  const averageRating = sql<number>`coalesce(avg(${ratings.rating}), 0)`;
  const base = db.select({
    id: stores.id,
    name: stores.name,
    email: stores.email,
    address: stores.address,
    ownerId: stores.ownerId,
    createdAt: stores.createdAt,
    rating: averageRating,
  }).from(stores).leftJoin(ratings, eq(ratings.storeId, stores.id)).where(where).groupBy(stores.id, stores.name, stores.email, stores.address, stores.ownerId, stores.createdAt);
  const orderColumn = input.sortBy === "rating" ? averageRating : storeSortColumns[input.sortBy] ?? stores.name;
  const rows = await base.orderBy(input.sortDirection === "desc" ? desc(orderColumn) : asc(orderColumn)).limit(input.pageSize).offset((input.page - 1) * input.pageSize);
  const totalRows = await db.select({ value: count() }).from(stores).where(where);
  return { rows, total: Number(totalRows[0]?.value ?? 0) };
}

export async function listStoresForUser(userId: number, input: { search?: string; storeId?: number; page: number; pageSize: number; sortBy: "name" | "address" | "rating"; sortDirection: SortDirection }) {
  const result = await listStores(input);
  if (!result.rows.length) return { ...result, rows: [] as Array<(typeof result.rows)[number] & { userRating: number | null }> };
  const db = requireDb(await getDb());
  const userRatings = await db.select({ storeId: ratings.storeId, rating: ratings.rating }).from(ratings).where(and(eq(ratings.userId, userId), inArray(ratings.storeId, result.rows.map(row => row.id))));
  const ratingMap = new Map(userRatings.map(row => [row.storeId, row.rating]));
  return { ...result, rows: result.rows.map(row => ({ ...row, userRating: ratingMap.get(row.id) ?? null })) };
}

export async function createStore(input: InsertStore) {
  const db = requireDb(await getDb());
  await db.insert(stores).values(input);
  const result = await db.select().from(stores).where(eq(stores.email, input.email)).orderBy(desc(stores.id)).limit(1);
  return result[0];
}

export async function getStoreByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.ownerId, ownerId)).limit(1);
  return result[0];
}

export async function getStoreById(storeId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  return result[0];
}

export async function upsertRating(storeId: number, userId: number, rating: number) {
  const db = requireDb(await getDb());
  const [store, user] = await Promise.all([getStoreById(storeId), getUserById(userId)]);
  if (!store) throw new Error("Store not found");
  if (!user || user.role !== "user") throw new Error("Only a normal user can submit a rating");
  await db.insert(ratings).values({ storeId, userId, rating }).onDuplicateKeyUpdate({ set: { rating, updatedAt: new Date() } });
  const result = await db.select().from(ratings).where(and(eq(ratings.storeId, storeId), eq(ratings.userId, userId))).limit(1);
  return result[0];
}

export async function getOwnerDashboard(ownerId: number, input: { sortBy: keyof typeof ownerRatingSortColumns; sortDirection: SortDirection }) {
  const db = requireDb(await getDb());
  const store = await getStoreByOwnerId(ownerId);
  if (!store) return { store: null, averageRating: 0, totalRatings: 0, submitters: [] };
  const [summary, submitters] = await Promise.all([
    db.select({ average: sql<number>`coalesce(avg(${ratings.rating}), 0)`, total: count() }).from(ratings).where(eq(ratings.storeId, store.id)),
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      address: users.address,
      rating: ratings.rating,
      submittedAt: ratings.updatedAt,
    }).from(ratings).innerJoin(users, eq(users.id, ratings.userId)).where(eq(ratings.storeId, store.id)).orderBy(input.sortDirection === "desc" ? desc(ownerRatingSortColumns[input.sortBy]) : asc(ownerRatingSortColumns[input.sortBy])),
  ]);
  return {
    store,
    averageRating: Number(summary[0]?.average ?? 0),
    totalRatings: Number(summary[0]?.total ?? 0),
    submitters,
  };
}

export async function getUserDetail(id: number) {
  const db = requireDb(await getDb());
  const user = await getUserById(id);
  if (!user) return undefined;
  const ownedStore = await db.select({ id: stores.id, name: stores.name, address: stores.address, averageRating: sql<number>`coalesce(avg(${ratings.rating}), 0)` }).from(stores).leftJoin(ratings, eq(ratings.storeId, stores.id)).where(eq(stores.ownerId, id)).groupBy(stores.id, stores.name, stores.address);
  return { user, ownedStore: ownedStore[0] ?? null };
}
