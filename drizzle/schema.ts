import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, datetime, primaryKey, index, mediumtext, date } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

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
    role: mysqlEnum("role", ["user", "club_admin", "admin", "club_officer"]).default("user").notNull(),
    password: text("password"),
    mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),

    // LEMC Member Profile Fields
    profilePhotoUrl: mediumtext("profilePhotoUrl"),
    fullName: varchar("fullName", { length: 255 }),
    roadName: varchar("roadName", { length: 255 }),
    documentNumber: varchar("documentNumber", { length: 100 }),
    motoClubId: int("motoClubId"),

    // New Fields for Enhanced Member Management
    phoneNumber: varchar("phoneNumber", { length: 20 }),
    phoneIsShared: boolean("phoneIsShared").default(false).notNull(),
    country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2
    memberId: varchar("memberId", { length: 20 }).unique(),
    memberSequence: int("memberSequence").unique(), // For sequential ID generation

    membershipStatus: mysqlEnum("membershipStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),

    // Terms acceptance for LGPD compliance
    termsAcceptedAt: datetime("termsAcceptedAt"),
    termsAcceptedIp: varchar("termsAcceptedIp", { length: 45 }),
    termsVersion: varchar("termsVersion", { length: 20 }),

    // Personal Info
    birthDate: date("birthDate"),

    // Soft Delete
    deletedAt: datetime("deletedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Moto Clubs table
 */
export const motoClubs = mysqlTable("motoclubs", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    foundingDate: timestamp("foundingDate"),
    admissionDate: timestamp("admissionDate"), // Date of admission to the coalition
    logoUrl: mediumtext("logoUrl"), // Use mediumtext for URLs
    description: text("description"),
    country: varchar("country", { length: 100 }),
    presidentId: int("presidentId"), // Reference to the Club President (User)
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),

    // Soft Delete
    deletedAt: datetime("deletedAt"),
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
export const passportCheckIns = mysqlTable("passportcheckins", {
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
export const membershipRequests = mysqlTable("membershiprequests", {
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

// ==========================================
// 📢 MÓDULO SOCIAL (Feed e Comunicação)
// ==========================================

export const posts = mysqlTable('posts', {
    id: varchar('id', { length: 36 }).primaryKey(),
    authorId: int('authorId').notNull().references(() => users.id),
    targetClubId: int('targetClubId').references(() => motoClubs.id),
    title: varchar('title', { length: 255 }),
    content: text('content').notNull(),
    mediaUrl: mediumtext('mediaUrl'),
    externalUrl: text('externalUrl'),
    isPinned: boolean('isPinned').default(false),
    createdAt: timestamp('createdAt').defaultNow(),
    updatedAt: timestamp('updatedAt').onUpdateNow(),
}, (table) => {
    return {
        clubIdx: index('club_idx').on(table.targetClubId),
        authorIdx: index('author_idx').on(table.authorId),
    };
});

export const comments = mysqlTable('comments', {
    id: varchar('id', { length: 36 }).primaryKey(),
    postId: varchar('postId', { length: 36 }).notNull().references(() => posts.id),
    authorId: int('authorId').notNull().references(() => users.id),
    content: text('content').notNull(),
    createdAt: timestamp('createdAt').defaultNow(),
});

export const likes = mysqlTable('likes', {
    postId: varchar('postId', { length: 36 }).notNull().references(() => posts.id),
    userId: int('userId').notNull().references(() => users.id),
    createdAt: timestamp('createdAt').defaultNow(),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.postId, table.userId] }),
    };
});

// Types
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type InsertLike = typeof likes.$inferInsert;


// ==========================================
// 🛡️ MÓDULO DE GOVERNANÇA (Punições/Strikes)
// ==========================================

export const userInfractions = mysqlTable('userinfractions', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: int('userId').notNull().references(() => users.id),
    appliedById: int('appliedById').notNull().references(() => users.id),
    reason: text('reason').notNull(),
    createdAt: timestamp('createdAt').defaultNow(),
});

export type UserInfraction = typeof userInfractions.$inferSelect;
export type InsertUserInfraction = typeof userInfractions.$inferInsert;


// ==========================================
// 🧠 AMBIENTE DE INTELIGÊNCIA (N.I.E.)
// ==========================================

export const governmentOrgans = mysqlTable('government_organs', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
});

export type GovernmentOrgan = typeof governmentOrgans.$inferSelect;
export type InsertGovernmentOrgan = typeof governmentOrgans.$inferInsert;

export const nieMemberships = mysqlTable('niememberships', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: int('userId').notNull().references(() => users.id),
    nominatedById: int('nominatedById').notNull().references(() => users.id),
    status: varchar('status', { length: 20 }).default('active'),
    joinedAt: timestamp('joinedAt').defaultNow(),

    // CIN Onboarding Fields
    isOnboarded: boolean('isOnboarded').default(false),
    contactInfo: text('contactInfo'), // Deprecated but kept for legacy

    // New Structured Fields
    orgCategory: varchar('orgCategory', { length: 50 }),
    workPhone: varchar('workPhone', { length: 20 }),
    functionalEmail: varchar('functionalEmail', { length: 320 }),

    governmentOrganId: varchar('governmentOrganId', { length: 36 }).references(() => governmentOrgans.id),
    sector: varchar('sector', { length: 255 }),
}, (table) => {
    return {
        userUniqueIdx: index('user_unique_idx').on(table.userId),
    };
});

export const nieIntelligenceReports = mysqlTable('nieintelligencereports', {
    id: varchar('id', { length: 36 }).primaryKey(),
    authorId: int('authorId').notNull().references(() => users.id),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(), // Max 5000 chars enforced in UI/API
    sourceLinks: text('sourceLinks'),

    // New Fields for "Produzir Conhecimento"
    eventDate: datetime('eventDate'),
    involvedClub: varchar('involvedClub', { length: 255 }),
    mediaUrl: mediumtext('mediaUrl'), // For multiple images/videos (JSON array)
    status: mysqlEnum('status', ['active', 'archived', 'deleted']).default('active'),
    createdAt: timestamp('createdAt').defaultNow(),
});

export type NieMembership = typeof nieMemberships.$inferSelect;
export type InsertNieMembership = typeof nieMemberships.$inferInsert;
export type NieIntelligenceReport = typeof nieIntelligenceReports.$inferSelect;
export type InsertNieIntelligenceReport = typeof nieIntelligenceReports.$inferInsert;

export const nieRequests = mysqlTable('nierequests', {
    id: varchar('id', { length: 36 }).primaryKey(),
    authorId: int('authorId').notNull().references(() => users.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    priority: mysqlEnum('priority', ['low', 'medium', 'high', 'critical']).default('medium'),
    type: mysqlEnum('type', ['mc_issue', 'agency_cooperation']).default('mc_issue'),
    status: mysqlEnum('status', ['open', 'in_progress', 'resolved']).default('open'),
    targetAgentId: int('targetAgentId').references(() => users.id),
    createdAt: timestamp('createdAt').defaultNow(),
    updatedAt: timestamp('updatedAt').onUpdateNow(),
});

export const nieReportReads = mysqlTable('nie_report_reads', {
    userId: int('userId').notNull().references(() => users.id),
    reportId: varchar('reportId', { length: 36 }).notNull().references(() => nieIntelligenceReports.id),
    readAt: timestamp('readAt').defaultNow(),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.userId, table.reportId] }),
    };
});

export type NieRequest = typeof nieRequests.$inferSelect;
export type InsertNieRequest = typeof nieRequests.$inferInsert;
export type NieReportRead = typeof nieReportReads.$inferSelect;
export type InsertNieReportRead = typeof nieReportReads.$inferInsert;
