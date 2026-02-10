import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with LEMC-specific fields for member profiles.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "club_admin", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  
  // LEMC Member Profile Fields
  profilePhotoUrl: text("profilePhotoUrl"),
  fullName: varchar("fullName", { length: 255 }),
  roadName: varchar("roadName", { length: 255 }),
  documentNumber: varchar("documentNumber", { length: 100 }),
  motoClubId: int("motoClubId"),
  membershipStatus: mysqlEnum("membershipStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  
  // Terms acceptance for LGPD compliance
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  termsAcceptedIp: varchar("termsAcceptedIp", { length: 45 }),
  termsVersion: varchar("termsVersion", { length: 20 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Moto Clubs table
 */
export const motoClubs = mysqlTable("motoClubs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  foundingDate: timestamp("foundingDate"),
  logoUrl: text("logoUrl"),
  description: text("description"),
  country: varchar("country", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MotoClub = typeof motoClubs.$inferSelect;
export type InsertMotoClub = typeof motoClubs.$inferInsert;

/**
 * Chapters table (subdivisions of moto clubs)
 */
export const chapters = mysqlTable("chapters", {
  id: int("id").autoincrement().primaryKey(),
  motoClubId: int("motoClubId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  foundingDate: timestamp("foundingDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = typeof chapters.$inferInsert;

/**
 * Motorcycles table (user garage - max 2 per user)
 */
export const motorcycles = mysqlTable("motorcycles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  licensePlate: varchar("licensePlate", { length: 50 }).notNull(),
  brand: varchar("brand", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  photoUrl: text("photoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Motorcycle = typeof motorcycles.$inferSelect;
export type InsertMotorcycle = typeof motorcycles.$inferInsert;

/**
 * Passport Check-ins table (travel registry with Google Maps locations)
 */
export const passportCheckIns = mysqlTable("passportCheckIns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  locationName: varchar("locationName", { length: 500 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address"),
  notes: text("notes"),
  checkInDate: timestamp("checkInDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PassportCheckIn = typeof passportCheckIns.$inferSelect;
export type InsertPassportCheckIn = typeof passportCheckIns.$inferInsert;

/**
 * Membership Requests table (for club admin approval workflow)
 */
export const membershipRequests = mysqlTable("membershipRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  motoClubId: int("motoClubId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  requestMessage: text("requestMessage"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MembershipRequest = typeof membershipRequests.$inferSelect;
export type InsertMembershipRequest = typeof membershipRequests.$inferInsert;
