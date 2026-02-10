import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { storagePut } from "./storage";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'club_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

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
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateUserProfile(ctx.user.id, input);
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
    
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        foundingDate: z.date().optional(),
        logoUrl: z.string().optional(),
        description: z.string().optional(),
        country: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMotoClub(input);
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
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
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

  // Admin - Membership Requests
  admin: router({
    pendingRequests: adminProcedure
      .input(z.object({ clubId: z.number() }))
      .query(async ({ input }) => {
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
        
        // Update user membership status
        if (request) {
          await db.updateUserProfile(request.userId, {
            membershipStatus: 'approved',
            motoClubId: request.motoClubId,
          });
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
  }),
});

export type AppRouter = typeof appRouter;
