import { nanoid } from "nanoid";
import { z } from "zod";
import { roleValues } from "../drizzle/schema";
import * as db from "./db";
import { hashPassword, publicUser, setApplicationSession, verifyPassword, clearApplicationSession } from "./auth";
import { adminProcedure, ownerProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import { systemRouter } from "./_core/systemRouter";

const nameSchema = z.string().trim().min(20, "Name must be at least 20 characters").max(60, "Name must be at most 60 characters");
const addressSchema = z.string().trim().min(1, "Address is required").max(400, "Address must be at most 400 characters");
const emailSchema = z.string().trim().email("Enter a valid email address").max(320);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(16, "Password must be at most 16 characters").regex(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/, "Password needs an uppercase letter and a special character");
const paginationSchema = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(50).default(10) });
const sortDirectionSchema = z.enum(["asc", "desc"]).default("asc");

const toSessionUser = (user: Awaited<ReturnType<typeof db.getUserByEmail>>) => {
  if (!user) throw new Error("User was not found after save");
  return publicUser(user);
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? publicUser(opts.ctx.user) : null)),
    signup: publicProcedure.input(z.object({ name: nameSchema, email: emailSchema, address: addressSchema, password: passwordSchema })).mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      if (await db.getUserByEmail(email)) throw new Error("An account with this email already exists");
      const user = await db.createUser({
        openId: `local_${nanoid(24)}`,
        name: input.name,
        email,
        passwordHash: hashPassword(input.password),
        address: input.address,
        loginMethod: "password",
        role: "user",
      });
      if (!user) throw new Error("Unable to create account");
      await setApplicationSession(ctx.req, ctx.res, user);
      return publicUser(user);
    }),
    login: publicProcedure.input(z.object({ email: emailSchema, password: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email.toLowerCase());
      if (!user || !verifyPassword(input.password, user.passwordHash)) throw new Error("Email or password is incorrect");
      await db.markUserSignedIn(user.id);
      await setApplicationSession(ctx.req, ctx.res, user);
      return publicUser(user);
    }),
    updatePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (!verifyPassword(input.currentPassword, ctx.user.passwordHash)) throw new Error("Current password is incorrect");
      await db.updateUserPassword(ctx.user.id, hashPassword(input.newPassword));
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearApplicationSession(ctx.req, ctx.res);
      return { success: true } as const;
    }),
  }),

  admin: router({
    dashboard: adminProcedure.query(() => db.getDashboardCounts()),
    users: adminProcedure.input(z.object({ search: z.string().optional(), address: z.string().optional(), role: z.enum(roleValues).optional(), includeOwners: z.boolean().default(false), sortBy: z.enum(["name", "email", "address", "role", "createdAt"]).default("name"), sortDirection: sortDirectionSchema, ...paginationSchema.shape })).query(({ input }) => db.listUsers(input)),
    userDetail: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => db.getUserDetail(input.id)),
    createUser: adminProcedure.input(z.object({ name: nameSchema, email: emailSchema, password: passwordSchema, address: addressSchema, role: z.enum(roleValues).default("user") })).mutation(async ({ input }) => {
      const email = input.email.toLowerCase();
      if (await db.getUserByEmail(email)) throw new Error("An account with this email already exists");
      const user = await db.createUser({ openId: `local_${nanoid(24)}`, name: input.name, email, passwordHash: hashPassword(input.password), address: input.address, loginMethod: "password", role: input.role });
      return toSessionUser(user ? await db.getUserByEmail(user.email) : undefined);
    }),
    stores: adminProcedure.input(z.object({ search: z.string().optional(), sortBy: z.enum(["name", "email", "address", "rating", "createdAt"]).default("name"), sortDirection: sortDirectionSchema, ...paginationSchema.shape })).query(({ input }) => db.listStores(input)),
    createStore: adminProcedure.input(z.object({ name: nameSchema, email: emailSchema, address: addressSchema, ownerId: z.number().int().positive().nullable().optional() })).mutation(async ({ input }) => {
      if (input.ownerId) {
        const owner = await db.getUserById(input.ownerId);
        if (!owner || owner.role !== "owner") throw new Error("Selected user is not a store owner");
      }
      return db.createStore(input);
    }),
  }),

  stores: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), sortDirection: sortDirectionSchema, ...paginationSchema.shape })).query(({ input, ctx }) => db.listStoresForUser(ctx.user.id, input)),
  }),

  ratings: router({
    submit: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), rating: z.number().int().min(1).max(5) })).mutation(({ input, ctx }) => db.upsertRating(input.storeId, ctx.user.id, input.rating)),
  }),

  owner: router({
    dashboard: ownerProcedure.query(({ ctx }) => db.getOwnerDashboard(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
