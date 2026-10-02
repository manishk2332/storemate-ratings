import { relations } from "drizzle-orm";
import { ratings, stores, users } from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  ratings: many(ratings),
  ownedStore: one(stores, {
    fields: [users.id],
    references: [stores.ownerId],
  }),
}));

export const storesRelations = relations(stores, ({ many, one }) => ({
  ratings: many(ratings),
  owner: one(users, {
    fields: [stores.ownerId],
    references: [users.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  store: one(stores, {
    fields: [ratings.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
}));
