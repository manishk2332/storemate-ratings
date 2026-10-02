# StoreMate Ratings Platform

StoreMate is a full-stack store-rating platform built for the FullStack Intern Coding Challenge. It uses React, an Express-compatible tRPC backend, Drizzle ORM, and the managed MySQL-compatible database.

## Live demo

Open the deployed application here:

**[Launch StoreMate Live Demo](https://storemate-t2ex8brw.manus.space)**     
<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/0e7adf0e-470b-4f03-b045-bb52b4356fb9" />



### How to test the demo

1. Open the live demo link and sign in with one of the accounts below.
2. Use the **Admin** account to review dashboard totals, stores, People, filters, sorting, and create forms.
3. Sign out and use the **Normal User** account to browse/search stores, open **Scan store QR**, and submit or modify a rating from 1–5. The scanner accepts a QR payload containing a numeric store ID, such as `2`, `storemate://store/2`, or `?storeId=2`.
4. Sign out and use the **Store Owner** account to view the store average rating and the users who submitted ratings.
5. The application also includes signup and password-update flows from the login/account screens.

The demo uses a shared seeded database, so rating totals may change when evaluators submit or modify ratings.

## Included assessment features

The app includes one email/password login flow with role-based access for **System Administrator**, **Normal User**, and **Store Owner**. Normal users can sign up, browse and search stores, scan a store QR code, sort stores by name/address/rating, submit a 1–5 rating, and modify their submitted rating. Administrators can view dashboard totals, create users and stores, filter and sort listings, and inspect user details. The Admin People table defaults to the assessment-required normal-user and administrator listing; Store Owner profiles are available through an explicit owner filter and include their store rating in detail view. Store owners can view their store’s average rating and sort rating submitters by name, email, address, rating, or submission date. All protected operations are authorized on the server.

The shared validation rules are implemented on the client and server: names are 20–60 characters, addresses are at most 400 characters, passwords are 8–16 characters with at least one uppercase and one special character, emails use standard validation, and ratings are integers from 1 to 5.

## Run locally in the managed project

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The development server listens on port `3000` by default. Useful checks are:

```bash
pnpm check
pnpm test
pnpm build
```

## Demo accounts

Run `pnpm db:seed` first. These accounts are for development/demo evaluation only:

| Role | Email | Password |
| --- | --- | --- |
| System Administrator | `admin@storemate.demo` | `Admin@123` |
| Normal User | `user@storemate.demo` | `User@123` |
| Store Owner | `owner@storemate.demo` | `Owner@123` |

## Project map

- `client/src/pages/`: login/signup, administrator, normal-user, owner, and password pages.
- `client/src/components/AppShell.tsx`: navigation, layout, shared dashboard UI.
- `server/routers.ts`: typed authentication, admin, stores, ratings, and owner procedures.
- `server/db.ts`: Drizzle queries, filtering, sorting, pagination, aggregation, and rating upserts.
- `server/auth.ts`: password hashing and signed application sessions.
- `drizzle/schema.ts`: normalized users, stores, and ratings tables.
- `drizzle/0001_yielding_champions.sql`: generated additive migration.
- `server/seed.ts`: idempotent representative demo data.

The application keeps the Preview-compatible `webdev_app_session` cookie and uses `SameSite=None; Secure` for the HTTPS embedded Preview context. The route manifest is available at `/manus-routes.json`.
