import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    // Retained for compatibility with the starter's Preview/OAuth session resolver.
    openId: varchar("openId", { length: 128 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }),
    address: text("address").notNull(),
    loginMethod: varchar("loginMethod", { length: 64 }).default("password").notNull(),
    role: mysqlEnum("role", ["user", "admin", "owner"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  })
);

export const stores = mysqlTable(
  "stores",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    address: text("address").notNull(),
    ownerId: int("ownerId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    nameIdx: index("stores_name_idx").on(table.name),
    emailIdx: index("stores_email_idx").on(table.email),
    ownerIdx: uniqueIndex("stores_owner_unique").on(table.ownerId),
  })
);

export const ratings = mysqlTable(
  "ratings",
  {
    id: int("id").autoincrement().primaryKey(),
    storeId: int("storeId").notNull().references(() => stores.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    rating: int("rating").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    storeUserUnique: uniqueIndex("ratings_store_user_unique").on(table.storeId, table.userId),
    storeIdx: index("ratings_store_idx").on(table.storeId),
    userIdx: index("ratings_user_idx").on(table.userId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;
export type Rating = typeof ratings.$inferSelect;
export type InsertRating = typeof ratings.$inferInsert;

export const roleValues = ["user", "admin", "owner"] as const;
export type AppRole = (typeof roleValues)[number];
