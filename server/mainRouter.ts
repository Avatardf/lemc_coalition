import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { inferRouterInputs, inferRouterOutputs, initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, inArray, and, sql, desc, isNull } from "drizzle-orm";
import * as db from "./db";
import { storagePut } from "./storage";
import { parse } from "cookie";
import crypto from "crypto";

// 2. ADICIONE AS NOVAS IMPORTAÇÕES DOS ARQUIVOS QUE CRIAMOS:
import { socialRouter } from './routers/social';
import { cinRouter } from './routers/cin';
import { governanceRouter } from './routers/governance';
import { authRouter } from './routers/auth';

// Helper to safely get cookie
function getCookie(req: any, name: string): string | undefined {
  if (req.cookies && req.cookies[name]) {
    return req.cookies[name];
  }
  if (req.headers && req.headers.cookie) {
    const parsed = parse(req.headers.cookie);
    return parsed[name];
  }
  return undefined;
}

// Helper to handle base64 image uploads
async function handleImageUpload(dataUrl: string | undefined, prefix: string): Promise<string | undefined> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;

  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.warn("[Storage] Invalid base64 data format");
      return dataUrl;
    }

    const mimeType = match[1];
    const extension = mimeType.split('/')[1]?.split('+')[0] || 'bin';
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const fileKey = `${prefix}/${Date.now()}-logo.${extension}`;

    console.log(`[Storage] Uploading image: ${mimeType}, size: ${buffer.length} bytes, key: ${fileKey}`);
    const { url } = await storagePut(fileKey, buffer, mimeType);
    console.log(`[Storage] Upload success: ${url}`);
    return url;
  } catch (error) {
    console.error("[Storage] Failed to upload base64 image:", error);
    return dataUrl;
  }
}

// Admin-only procedure (Club Admin or Super Admin)
// Admin-only procedure (Club Admin, Club Officer, or Super Admin)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'club_admin' && ctx.user.role !== 'club_officer') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Super Admin-only procedure
const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Super Admin access required' });
  }
  return next({ ctx });
});

// Define cookie name logic
const IMPERSONATOR_COOKIE_NAME = "lemc_impersonator_session";

console.log("[Router] Initializing v1.0.1 - RECOVERY");

export const appRouter = router({
  // 3. REGISTRE OS NOVOS NAMESPACES:
  social: socialRouter,
  cin: cinRouter,
  governance: governanceRouter,

  system: systemRouter,
  ping: publicProcedure.query(() => 'pong'),
  auth: authRouter,




  // Profile management
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),

    update: protectedProcedure
      .input(z.object({
        fullName: z.string().optional(),
        roadName: z.string().optional(),
        documentNumber: z.string().optional(),
        motoClubId: z.number().optional(),
        phoneNumber: z.string().optional(),
        phoneIsShared: z.boolean().optional(),
        country: z.string().length(2).optional(),
        birthDate: z.string().optional(), // Receive as string (YYYY-MM-DD)
      }))
      .mutation(async ({ ctx, input }) => {
        const { birthDate, ...rest } = input;
        const updateData: any = { ...rest };

        if (birthDate) {
          updateData.birthDate = new Date(birthDate);
        }

        return db.updateUserProfile(ctx.user.id, updateData);
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        fileData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `profiles/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        return db.updateUserProfile(ctx.user.id, { profilePhotoUrl: url });
      }),
  }),

  // Moto Clubs
  motoClubs: router({
    list: publicProcedure.query(async () => {
      return db.getAllMotoClubs();
    }),

    getMembers: publicProcedure
      .input(z.object({ clubId: z.number() }))
      .query(async ({ input, ctx }) => {
        const members = await db.getMembersByClubId(input.clubId);

        // Fetch CIN status
        // optimized: get all cin memberships for these users
        const dbInstance = await db.getDb();
        let cinMemberIds = new Set<number>();

        if (dbInstance && members.length > 0) {
          const cinMembers = await dbInstance.select()
            .from(db.nieMemberships)
            // @ts-ignore
            .where(inArray(db.nieMemberships.userId, members.map(m => m.id)));

          cinMembers.forEach(cm => cinMemberIds.add(cm.userId));
        }

        return members.map(m => ({
          ...m,
          phoneNumber: m.phoneIsShared ? m.phoneNumber : null,
          isCinMember: cinMemberIds.has(m.id),
          // Hide sensitive data
          email: null,
          openId: null,
          documentNumber: null,
        }));
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getMotoClubById(input.id);
      }),

    getChapters: publicProcedure
      .input(z.object({ clubId: z.number() }))
      .query(async ({ input }) => {
        return db.getChaptersByClubId(input.clubId);
      }),

    getClubMotorcycleStats: publicProcedure
      .input(z.object({ clubId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];

        const stats = await dbInstance
          .select({
            brand: db.motorcycles.brand,
            count: sql<number>`count(*)`,
          })
          .from(db.motorcycles)
          .innerJoin(db.users, eq(db.users.id, db.motorcycles.userId))
          .where(and(
            eq(db.users.motoClubId, input.clubId),
            isNull(db.users.deletedAt)
          ))
          .groupBy(db.motorcycles.brand)
          .orderBy(desc(sql`count(*)`));

        return stats.map(s => ({
          brand: s.brand,
          count: Number(s.count)
        }));
      }),

    create: superAdminProcedure
      .input(z.object({
        name: z.string(),
        foundingDate: z.date().optional(),
        logoUrl: z.string().optional(),
        description: z.string().optional(),
        country: z.string().optional(),
        presidentEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const { presidentEmail, ...clubData } = input;

        // Handle base64 logo
        if (clubData.logoUrl) {
          clubData.logoUrl = await handleImageUpload(clubData.logoUrl, 'clubs');
        }

        let presidentId: number | undefined;
        if (presidentEmail) {
          const user = await db.getUserByEmail(presidentEmail);
          if (user) {
            presidentId = user.id;
          }
        }

        const club = await db.createMotoClub({
          ...clubData,
          presidentId,
        });

        if (club && presidentId) {
          // Assign role 'club_admin' to the designated president
          const presidentUser = await db.getUserById(presidentId);
          if (presidentUser) {
            const newRole = presidentUser.role === 'admin' ? 'admin' : 'club_admin';
            await db.updateUserProfile(presidentId, {
              role: newRole,
              motoClubId: club.id,
              membershipStatus: 'approved' // Auto-approve the president
            });
          }
        }

        return club;
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        foundingDate: z.date().optional(),
        logoUrl: z.string().optional(),
        description: z.string().optional(),
        country: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        // Handle base64 logo
        if (data.logoUrl) {
          data.logoUrl = await handleImageUpload(data.logoUrl, 'clubs');
        }

        // Security Check: Club Admins can only edit THEIR OWN club
        if (ctx.user.role === 'club_admin' && ctx.user.motoClubId !== id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own club' });
        }

        return db.updateMotoClub(id, data);
      }),

    addChapter: adminProcedure
      .input(z.object({
        motoClubId: z.number(),
        name: z.string(),
        location: z.string().optional(),
        foundingDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createChapter(input);
      }),

    deleteChapter: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteChapter(input.id);
        return { success: true };
      }),

    delete: superAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.softDeleteMotoClub(input.id);
        return { success: true };
      }),

    listDeleted: superAdminProcedure.query(async () => {
      return db.getDeletedMotoClubs();
    }),
  }),

  // Garage (Motorcycles)
  garage: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getMotorcyclesByUserId(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({
        licensePlate: z.string(),
        brand: z.string(),
        model: z.string(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already has 2 motorcycles
        const existing = await db.getMotorcyclesByUserId(ctx.user.id);
        if (existing.length >= 2) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Maximum of 2 motorcycles allowed per user'
          });
        }

        return db.createMotorcycle({
          ...input,
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        licensePlate: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMotorcycle(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMotorcycle(input.id, ctx.user.id);
        return { success: true };
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        motorcycleId: z.number(),
        fileData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `motorcycles/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        return db.updateMotorcycle(input.motorcycleId, { photoUrl: url });
      }),
  }),

  // Passport (Check-ins)
  passport: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCheckInsByUserId(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({
        locationName: z.string(),
        latitude: z.string(),
        longitude: z.string(),
        address: z.string().optional(),
        notes: z.string().optional(),
        checkInDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createCheckIn({
          ...input,
          userId: ctx.user.id,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCheckIn(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Admin procedures
  admin: router({
    pingAdmin: adminProcedure.query(() => ({ status: "ok", version: "1.0.1", timestamp: new Date().toISOString() })),
    createUser: adminProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string(),
        roadName: z.string().optional(),
        role: z.enum(['user', 'club_admin', 'admin', 'club_officer']),
        motoClubId: z.number().optional(),
        country: z.string().length(2).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          console.log(`[Admin] Creating user: ${input.email}`);
          const existing = await db.getUserByEmail(input.email);
          if (existing) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'E-mail já cadastrado.' });
          }

          // Security check for role assignment
          if (ctx.user.role === 'club_admin' || ctx.user.role === 'club_officer') {
            if (input.role === 'admin') {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para criar administradores gerais.' });
            }
            if (!input.motoClubId || input.motoClubId !== ctx.user.motoClubId) {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'Você só pode criar membros para o seu próprio clube.' });
            }
          }

          const openId = crypto.randomUUID();
          const bcrypt = await import("bcryptjs");
          const hashedPassword = await bcrypt.hash("coalition2015", 10);

          console.log(`[Admin] UPSERTING user with openId: ${openId}`);
          await db.upsertUser({
            openId,
            email: input.email,
            name: input.name,
            roadName: input.roadName,
            role: input.role,
            motoClubId: input.motoClubId,
            country: input.country,
            membershipStatus: 'approved', // Created by admin = auto-approved
            // @ts-ignore - drizzle schema has these but InsertUser might be lacking
            password: hashedPassword,
            mustChangePassword: true,
          });
          console.log(`[Admin] User created successfully: ${input.email}`);

          return { success: true };
        } catch (error: any) {
          console.error("[Admin] Error in createUser:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || "Erro ao criar usuário." });
        }
      }),

    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['user', 'club_admin', 'admin', 'club_officer']),
        isCinMember: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          console.log(`[Admin] Updating role for user ${input.userId} to ${input.role} (isCin: ${input.isCinMember})`);

          const targetUser = await db.getUserById(input.userId);
          if (!targetUser) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado.' });
          }

          // Security Checks
          if (ctx.user.role === 'club_admin' || ctx.user.role === 'club_officer') {
            // Club Admins/Officers can only manage their own club members
            if (targetUser.motoClubId !== ctx.user.motoClubId) {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'Você só pode gerenciar membros do seu próprio clube.' });
            }
            // Club Admins/Officers cannot promote to Global Admin
            if (input.role === 'admin') {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para atribuir esta função.' });
            }
            // Club Officers cannot promote to Club Admin
            if (ctx.user.role === 'club_officer' && input.role === 'club_admin') {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para atribuir esta função.' });
            }
          }

          // Update User Role
          console.log(`[Admin] Calling db.updateUserProfile for ${input.userId}`);
          await db.updateUserProfile(input.userId, { role: input.role });

          // Manage CIN Membership
          const dbInstance = await db.getDb();
          if (dbInstance) {
            if (input.isCinMember) {
              // Add to CIN if not exists
              // @ts-ignore
              const existing = await dbInstance.select().from(db.nieMemberships).where(eq(db.nieMemberships.userId, input.userId)).limit(1);
              if (existing.length === 0) {
                await dbInstance.insert(db.nieMemberships).values({
                  id: crypto.randomUUID(),
                  userId: input.userId,
                  nominatedById: ctx.user.id,
                  status: 'active'
                });
              }
            } else {
              // Remove from CIN if exists
              // @ts-ignore
              await dbInstance.delete(db.nieMemberships).where(eq(db.nieMemberships.userId, input.userId));
            }
          }

          return { success: true };
        } catch (error: any) {
          console.error("[Admin] Error in updateUserRole:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || "Erro ao atualizar função." });
        }
      }),

    listUsers: adminProcedure
      .input(z.object({
        motoClubId: z.number().optional(),
        country: z.string().optional(),
        role: z.enum(['user', 'club_admin', 'admin', 'club_officer']).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const filters = { ...input };
        console.log('[TRPC] listUsers input:', input);
        console.log('[TRPC] listUsers User:', { id: ctx.user.id, email: ctx.user.email, role: ctx.user.role, clubId: ctx.user.motoClubId });

        // Security: Club Admins/Officers only see their own club
        if (ctx.user.role === 'club_admin' || ctx.user.role === 'club_officer') {
          console.log('[TRPC] Restricting listUsers to club:', ctx.user.motoClubId);
          filters.motoClubId = ctx.user.motoClubId || -1;
        }

        const usersList = await db.getAllUsers(filters);
        console.log('[TRPC] listUsers result count (before enrichment):', usersList.length);

        // Fetch CIN memberships to enrich data
        // const dbInstance = await db.getDb();
        // const cinMemberIds = new Set<number>();
        // try {
        //   if (dbInstance && usersList.length > 0) {
        //     const cinMembers = await dbInstance.select()
        //       .from(db.nieMemberships)
        //       // @ts-ignore
        //       .where(inArray(db.nieMemberships.userId, usersList.map(u => u.id)));

        //     cinMembers.forEach(cm => cinMemberIds.add(cm.userId));
        //   }
        // } catch (err) {
        //   console.error("Error fetching CIN members:", err);
        //   // Non-fatal error, continue without CIN info
        // }

        if (usersList.length === 0) {
          // DEBUG: Return a fake user with filter info to debug frontend
          return [{
            id: -999,
            name: 'DEBUG INFO (NO RESULTS)',
            email: JSON.stringify(filters),
            role: 'admin',
            motoClubId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
            openId: 'debug',
            // other required fields mock
            mustChangePassword: false,
            phoneIsShared: false,
            membershipStatus: 'approved',
            isCinMember: false
          } as any];
        }

        return usersList.map(u => ({
          ...u,
          isCinMember: false // cinMemberIds.has(u.id)
        }));
      }),

    impersonateUser: superAdminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        // Store original session
        const currentSession = getCookie(ctx.req, COOKIE_NAME);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        // We need ONE_YEAR_MS here
        const ONE_YEAR_MS = 31536000000;

        if (currentSession) {
          ctx.res.cookie(IMPERSONATOR_COOKIE_NAME, currentSession, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        }

        // Create new session for target
        const sessionToken = await import("./_core/sdk").then(m => m.sdk.createSessionToken(targetUser.openId, {
          name: targetUser.name || 'Impersonated User',
          expiresInMs: ONE_YEAR_MS,
        }));

        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    stopImpersonating: publicProcedure.mutation(({ ctx }) => {
      const originalSession = getCookie(ctx.req, IMPERSONATOR_COOKIE_NAME);
      if (!originalSession) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not impersonating' });
      }

      const cookieOptions = getSessionCookieOptions(ctx.req);
      const ONE_YEAR_MS = 31536000000;

      // Restore original session
      ctx.res.cookie(COOKIE_NAME, originalSession, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      // Clear impersonator cookie
      ctx.res.clearCookie(IMPERSONATOR_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

      return { success: true };
    }),

    pendingRequests: adminProcedure
      .input(z.object({ clubId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Security Check: Club Admins can only see THEIR OWN club
        if (ctx.user.role === 'club_admin' && ctx.user.motoClubId !== input.clubId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only manage your own club' });
        }
        // Super Admins can see any (no extra check needed)

        return db.getPendingRequestsByClubId(input.clubId);
      }),

    approveRequest: adminProcedure
      .input(z.object({
        requestId: z.number(),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const request = await db.updateMembershipRequest(input.requestId, {
          status: 'approved',
          reviewedBy: ctx.user.id,
          reviewNotes: input.reviewNotes,
        });


        // Update user membership status and Generate ID if approving
        if (request) {
          const user = await db.getUserById(request.userId);

          let updateData: any = {
            membershipStatus: 'approved',
            motoClubId: request.motoClubId,
          };

          // Generate Member ID if not already present
          if (user && !user.memberId) {
            const sequence = await db.getNextMemberSequence();
            const countryCode = (user.country || 'XX').toUpperCase();
            // Format: [XX]-NNN.NNN-W
            const formattedSeq = sequence.toString().padStart(6, '0');
            const seqPart1 = formattedSeq.slice(0, 3);
            const seqPart2 = formattedSeq.slice(3);
            const memberId = `[${countryCode}]-${seqPart1}.${seqPart2}-W`;

            updateData.memberId = memberId;
            updateData.memberSequence = sequence;
          }

          await db.updateUserProfile(request.userId, updateData);
        }

        return request;
      }),

    rejectRequest: adminProcedure
      .input(z.object({
        requestId: z.number(),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const request = await db.updateMembershipRequest(input.requestId, {
          status: 'rejected',
          reviewedBy: ctx.user.id,
          reviewNotes: input.reviewNotes,
        });

        // Update user membership status
        if (request) {
          await db.updateUserProfile(request.userId, {
            membershipStatus: 'rejected',
          });
        }

        return request;
      }),

    removeMember: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userToRemove = await db.getUserById(input.userId);
        if (!userToRemove) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        // Security Check for Club Admins
        if (ctx.user.role === 'club_admin' || ctx.user.role === 'club_officer') {
          if (userToRemove.motoClubId !== ctx.user.motoClubId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only remove members from your own club' });
          }
        }

        await db.softDeleteUser(input.userId);
        return { success: true };
      }),



    requestMembership: protectedProcedure
      .input(z.object({
        motoClubId: z.number(),
        requestMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMembershipRequest({
          userId: ctx.user.id,
          motoClubId: input.motoClubId,
          requestMessage: input.requestMessage,
        });
      }),

    getMyPendingRequest: protectedProcedure
      .query(async ({ ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return null;

        const requests = await dbInstance.select()
          .from(db.membershipRequests)
          .where(and(
            eq(db.membershipRequests.userId, ctx.user.id),
            eq(db.membershipRequests.status, 'pending')
          ))
          .limit(1);

        return requests.length > 0 ? requests[0] : null;
      }),
  }),
});
// Export the appRouter for use in the server and type definition
export type AppRouter = typeof appRouter;
