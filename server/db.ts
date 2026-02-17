import { drizzle } from "drizzle-orm/mysql2";
import { eq, desc, isNull, isNotNull, and, inArray, or } from "drizzle-orm";
import {
  InsertUser,
  users,
  motoClubs,
  chapters,
  motorcycles,
  passportCheckIns,
  membershipRequests,
  MotoClub,
  Chapter,
  Motorcycle,
  PassportCheckIn,
  MembershipRequest
} from "../drizzle/schema";
import { ENV } from './_core/env';

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "fullName", "roadName", "documentNumber", "profilePhotoUrl"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.motoClubId !== undefined) {
      values.motoClubId = user.motoClubId;
      updateSet.motoClubId = user.motoClubId;
    }
    if (user.membershipStatus !== undefined) {
      values.membershipStatus = user.membershipStatus;
      updateSet.membershipStatus = user.membershipStatus;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: {
  fullName?: string;
  roadName?: string;
  documentNumber?: string;
  profilePhotoUrl?: string;
  motoClubId?: number;
  membershipStatus?: 'pending' | 'approved' | 'rejected';
}) {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(users).set(data).where(eq(users.id, userId));
  return getUserById(userId);
}

// Moto Clubs
export async function getAllMotoClubs(): Promise<MotoClub[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(motoClubs);
}

export async function getMotoClubById(id: number): Promise<MotoClub | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(motoClubs).where(eq(motoClubs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMembersByClubId(clubId: number): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(users).where(and(
    eq(users.motoClubId, clubId),
    or(
      eq(users.membershipStatus, 'approved'),
      eq(users.role, 'club_admin'),
      eq(users.role, 'admin')
    )
  ));
}

export async function createMotoClub(data: typeof motoClubs.$inferInsert): Promise<MotoClub | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(motoClubs).values(data);
  return getMotoClubById(Number((result as any).insertId));
}

export async function updateMotoClub(id: number, data: Partial<typeof motoClubs.$inferInsert>) {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(motoClubs).set(data).where(eq(motoClubs.id, id));
  return getMotoClubById(id);
}

// Chapters
export async function getChaptersByClubId(clubId: number): Promise<Chapter[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(chapters).where(eq(chapters.motoClubId, clubId));
}

export async function createChapter(data: typeof chapters.$inferInsert): Promise<Chapter | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(chapters).values(data);
  const insertedId = Number((result as any).insertId);
  const inserted = await db.select().from(chapters).where(eq(chapters.id, insertedId)).limit(1);
  return inserted.length > 0 ? inserted[0] : undefined;
}

export async function deleteChapter(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(chapters).where(eq(chapters.id, id));
}

// Motorcycles
export async function getMotorcyclesByUserId(userId: number): Promise<Motorcycle[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(motorcycles).where(eq(motorcycles.userId, userId));
}

export async function createMotorcycle(data: typeof motorcycles.$inferInsert): Promise<Motorcycle | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(motorcycles).values(data);
  const insertedId = Number((result as any).insertId);
  const inserted = await db.select().from(motorcycles).where(eq(motorcycles.id, insertedId)).limit(1);
  return inserted.length > 0 ? inserted[0] : undefined;
}

export async function updateMotorcycle(id: number, data: Partial<typeof motorcycles.$inferInsert>) {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(motorcycles).set(data).where(eq(motorcycles.id, id));
  const updated = await db.select().from(motorcycles).where(eq(motorcycles.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function deleteMotorcycle(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(motorcycles).where(and(eq(motorcycles.id, id), eq(motorcycles.userId, userId)));
}

// Passport Check-ins
export async function getCheckInsByUserId(userId: number): Promise<PassportCheckIn[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(passportCheckIns).where(eq(passportCheckIns.userId, userId)).orderBy(desc(passportCheckIns.checkInDate));
}

export async function createCheckIn(data: typeof passportCheckIns.$inferInsert): Promise<PassportCheckIn | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(passportCheckIns).values(data);
  const insertedId = Number((result as any).insertId);
  const inserted = await db.select().from(passportCheckIns).where(eq(passportCheckIns.id, insertedId)).limit(1);
  return inserted.length > 0 ? inserted[0] : undefined;
}

export async function deleteCheckIn(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(passportCheckIns).where(and(eq(passportCheckIns.id, id), eq(passportCheckIns.userId, userId)));
}

// Membership Requests
export async function getPendingRequestsByClubId(clubId: number): Promise<MembershipRequest[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(membershipRequests)
    .where(and(eq(membershipRequests.motoClubId, clubId), eq(membershipRequests.status, 'pending')))
    .orderBy(desc(membershipRequests.createdAt));
}

export async function createMembershipRequest(data: typeof membershipRequests.$inferInsert): Promise<MembershipRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(membershipRequests).values(data);
  const insertedId = Number((result as any).insertId);
  const inserted = await db.select().from(membershipRequests).where(eq(membershipRequests.id, insertedId)).limit(1);
  return inserted.length > 0 ? inserted[0] : undefined;
}

export async function updateMembershipRequest(id: number, data: {
  status: 'approved' | 'rejected';
  reviewedBy: number;
  reviewNotes?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(membershipRequests).set({
    ...data,
    reviewedAt: new Date(),
  }).where(eq(membershipRequests.id, id));

  const updated = await db.select().from(membershipRequests).where(eq(membershipRequests.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}
