import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ne, eq, and, isNull, or, desc } from "drizzle-orm";
import { nieMemberships, nieIntelligenceReports, nieRequests, users, nieReportReads, governmentOrgans } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import crypto from "crypto";

export const cinRouter = router({
    nominateMember: protectedProcedure
        .input(z.object({
            userIdToNominate: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
            }

            // 1. Verify if requester is Club President (club_admin) or Admin
            if (ctx.user.role !== 'club_admin' && ctx.user.role !== 'admin') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Only Club Presidents can nominate members to CIN'
                });
            }

            // 2. Verify if target user belongs to the same club (if club_admin)
            const targetUser = await db.query.users.findFirst({
                where: eq(users.id, input.userIdToNominate)
            });

            if (!targetUser) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
            }

            if (ctx.user.role === 'club_admin') {
                if (targetUser.motoClubId !== ctx.user.motoClubId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You can only nominate members from your own club'
                    });
                }
            }

            // 3. Check if already a member
            const existingMembership = await db.query.nieMemberships.findFirst({
                where: eq(nieMemberships.userId, input.userIdToNominate)
            });

            if (existingMembership) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'User is already a CIN member'
                });
            }

            // 4. Create Nomination
            await db.insert(nieMemberships).values({
                id: crypto.randomUUID(),
                userId: input.userIdToNominate,
                nominatedById: ctx.user.id,
                status: 'active',
            });

            return { success: true };
            return { success: true };
        }),

    // 1. Check Access and Onboarding Status
    getAccessStatus: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return { hasAccess: false, isOnboarded: false };

        console.log(`[CIN Access] Checking user ${ctx.user.id}, Role: '${ctx.user.role}', ClubId: ${ctx.user.motoClubId}`);

        const membership = await db.query.nieMemberships.findFirst({
            where: eq(nieMemberships.userId, ctx.user.id),
        });

        console.log(`[CIN Access] Membership found:`, membership);

        // If admin or club_admin, allow access regardless of membership, 
        // but they still need to be "onboarded" to use the tools effectively.
        if (ctx.user.role === 'admin' || ctx.user.role === 'club_admin') {
            const isOnboarded = !!(membership && membership.isOnboarded);
            console.log(`[CIN Access] Admin/ClubAdmin access granted. IsOnboarded: ${isOnboarded}`);
            return { hasAccess: true, isOnboarded };
        }

        if (!membership || membership.status !== 'active') {
            console.log(`[CIN Access] Access denied. No active membership.`);
            return { hasAccess: false, isOnboarded: false };
        }

        console.log(`[CIN Access] Access granted. IsOnboarded: ${membership.isOnboarded}`);
        return { hasAccess: true, isOnboarded: membership.isOnboarded };
    }),

    // 2. Fetch Government Organs List
    getOrgans: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) return [];
        // Need to import governmentOrgans from schema
        const { governmentOrgans } = await import('../../drizzle/schema');
        return await db.select().from(governmentOrgans).orderBy(governmentOrgans.name);
    }),

    // 3. Process First Access Form
    submitOnboarding: protectedProcedure
        .input(z.object({
            contactInfo: z.string().optional(), // Kept for legacy compatibility
            orgName: z.string().min(2, "Organ name required."),
            orgCategory: z.string().min(2, "Category required."), // New
            sector: z.string().min(2, "Sector required."),
            workPhone: z.string().min(5, "Work phone required."), // New
            functionalEmail: z.string().email("Invalid email."), // New
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            const { governmentOrgans } = await import('../../drizzle/schema');

            // Verify Permission or Role
            const membership = await db.query.nieMemberships.findFirst({
                where: eq(nieMemberships.userId, ctx.user.id),
            });

            // If not a member AND not an admin, deny
            if ((!membership || membership.status !== 'active') && ctx.user.role !== 'admin' && ctx.user.role !== 'club_admin') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Access denied.' });
            }

            // Organ Logic: Check if exists, else create
            let organId = '';
            const existingOrgan = await db.query.governmentOrgans.findFirst({
                where: eq(governmentOrgans.name, input.orgName),
            });

            if (existingOrgan) {
                organId = existingOrgan.id;
            } else {
                organId = crypto.randomUUID();
                await db.insert(governmentOrgans).values({
                    id: organId,
                    name: input.orgName.toUpperCase(),
                });
            }

            // Combine contact info for legacy support
            const combinedContact = `Phone: ${input.workPhone} | Email: ${input.functionalEmail}`;

            // If membership exists, update. If not (and is admin), create new.
            if (membership) {
                await db.update(nieMemberships)
                    .set({
                        contactInfo: combinedContact,
                        workPhone: input.workPhone,
                        functionalEmail: input.functionalEmail,
                        orgCategory: input.orgCategory,
                        governmentOrganId: organId,
                        sector: input.sector,
                        isOnboarded: true,
                    })
                    .where(eq(nieMemberships.id, membership.id));
            } else {
                // Create new membership for Admin/Club Admin
                await db.insert(nieMemberships).values({
                    id: crypto.randomUUID(),
                    userId: ctx.user.id,
                    nominatedById: ctx.user.id, // Self-nominated
                    status: 'active',
                    contactInfo: combinedContact,
                    workPhone: input.workPhone,
                    functionalEmail: input.functionalEmail,
                    orgCategory: input.orgCategory,
                    governmentOrganId: organId,
                    sector: input.sector,
                    isOnboarded: true,
                });
            }

            return { success: true };
        }),

    getMembershipStatus: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return { isMember: false, status: null };

        // 1. Check if user is explicitly a CIN member
        const membership = await db.query.nieMemberships.findFirst({
            where: eq(nieMemberships.userId, ctx.user.id)
        });

        if (membership) {
            return { isMember: true, status: membership.status };
        }

        // 2. Grant access to Global Admin and Club President (club_admin)
        // explicitly EXCLUDING 'club_officer' (Membro Admin) from this automatic access
        if (ctx.user.role === 'admin' || ctx.user.role === 'club_admin') {
            return { isMember: true, status: 'active' };
        }

        return { isMember: false, status: null };
    }),

    getReports: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        // Security: Only Admin, Club President, or NIE Member can access
        let hasAccess = false;
        if (ctx.user.role === 'admin' || ctx.user.role === 'club_admin') {
            hasAccess = true;
        } else {
            const membership = await db.select().from(nieMemberships)
                .where(and(eq(nieMemberships.userId, ctx.user.id), eq(nieMemberships.status, 'active')))
                .limit(1);
            if (membership.length > 0) hasAccess = true;
        }

        if (!hasAccess) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado ao CIN.' });
        }

        // Fetch reports with author using robust select/join
        const reportsData = await db.select({
            id: nieIntelligenceReports.id,
            authorId: nieIntelligenceReports.authorId,
            title: nieIntelligenceReports.title,
            content: nieIntelligenceReports.content,
            createdAt: nieIntelligenceReports.createdAt,
            status: nieIntelligenceReports.status,
            mediaUrl: nieIntelligenceReports.mediaUrl,
            sourceLinks: nieIntelligenceReports.sourceLinks,
            eventDate: nieIntelligenceReports.eventDate,
            involvedClub: nieIntelligenceReports.involvedClub,
            authorName: users.fullName,
            authorRoad: users.roadName,
        })
            .from(nieIntelligenceReports)
            .leftJoin(users, eq(nieIntelligenceReports.authorId, users.id))
            .where(eq(nieIntelligenceReports.status, 'active'))
            .orderBy(desc(nieIntelligenceReports.createdAt));

        const readReports = await db.select().from(nieReportReads)
            .where(eq(nieReportReads.userId, ctx.user.id));
        const readIds = new Set(readReports.map(r => r.reportId));

        return reportsData.map(row => ({
            id: row.id,
            authorId: row.authorId,
            title: row.title,
            content: row.content,
            createdAt: row.createdAt,
            status: row.status,
            mediaUrl: row.mediaUrl,
            sourceLinks: row.sourceLinks,
            eventDate: row.eventDate,
            involvedClub: row.involvedClub,
            author: {
                id: row.authorId,
                fullName: row.authorName,
                roadName: row.authorRoad,
            },
            isRead: readIds.has(row.id)
        }));
    }),

    createReport: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            content: z.string().min(1),
            sourceLinks: z.string().optional(),
            eventDate: z.string().optional(),
            involvedClub: z.string().optional(),
            mediaUrl: z.string().optional(),
            fileData: z.array(z.object({
                base64: z.string(),
                name: z.string(),
                mime: z.string()
            })).max(10).optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            let finalMediaUrls: string[] = [];
            if (input.mediaUrl) {
                finalMediaUrls.push(input.mediaUrl);
            }

            // Handle file uploads if provided
            if (input.fileData && input.fileData.length > 0) {
                for (const file of input.fileData) {
                    try {
                        const buffer = Buffer.from(file.base64, 'base64');
                        const fileKey = `cin-reports/${ctx.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        const { url } = await storagePut(fileKey, buffer, file.mime);
                        finalMediaUrls.push(url);
                    } catch (error) {
                        console.error("[CIN] Image upload failed for file:", file.name, error);
                    }
                }
            }

            // Security Check
            let hasAccess = false;
            if (ctx.user.role === 'admin' || ctx.user.role === 'club_admin') {
                hasAccess = true;
            } else {
                const membership = await db.query.nieMemberships.findFirst({
                    where: eq(nieMemberships.userId, ctx.user.id)
                });
                if (membership && membership.status === 'active') hasAccess = true;
            }
            if (!hasAccess) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado.' });

            await db.insert(nieIntelligenceReports).values({
                id: crypto.randomUUID(),
                authorId: ctx.user.id,
                title: input.title,
                content: input.content,
                sourceLinks: input.sourceLinks || null,
                // New Fields
                eventDate: input.eventDate ? new Date(input.eventDate) : null,
                involvedClub: input.involvedClub || null,
                mediaUrl: finalMediaUrls.length > 0 ? JSON.stringify(finalMediaUrls) : null,
                createdAt: new Date(),
            });

            return { success: true };
        }),

    // --- Intelligence Requests (Demandas) ---

    createRequest: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            description: z.string().min(1),
            priority: z.enum(['low', 'medium', 'high', 'critical']),
            type: z.enum(['mc_issue', 'agency_cooperation']),
            targetAgentId: z.number().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            // Security Check
            let hasAccess = false;
            if (ctx.user.role === 'admin' || ctx.user.role === 'club_admin') {
                hasAccess = true;
            } else {
                const membership = await db.query.nieMemberships.findFirst({
                    where: eq(nieMemberships.userId, ctx.user.id)
                });
                if (membership && membership.status === 'active') hasAccess = true;
            }
            if (!hasAccess) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado.' });

            await db.insert(nieRequests).values({
                id: crypto.randomUUID(),
                authorId: ctx.user.id,
                title: input.title,
                description: input.description,
                priority: input.priority,
                type: input.type,
                targetAgentId: input.targetAgentId || null,
                status: 'open',
            });

            return { success: true };
        }),

    getRequests: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        // Security Check
        let hasAccess = false;
        if (ctx.user.role === 'admin' || ctx.user.role === 'club_admin') {
            hasAccess = true;
        } else {
            const membership = await db.query.nieMemberships.findFirst({
                where: eq(nieMemberships.userId, ctx.user.id)
            });
            if (membership && membership.status === 'active') hasAccess = true;
        }
        if (!hasAccess) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado.' });

        const requestsData = await db.select({
            request: nieRequests,
            author: {
                id: users.id,
                fullName: users.fullName,
                roadName: users.roadName,
                country: users.country,
                orgCategory: nieMemberships.orgCategory,
                organName: governmentOrgans.name,
            }
        })
            .from(nieRequests)
            .leftJoin(users, eq(nieRequests.authorId, users.id))
            .leftJoin(nieMemberships, eq(users.id, nieMemberships.userId))
            .leftJoin(governmentOrgans, eq(nieMemberships.governmentOrganId, governmentOrgans.id))
            .where(
                ctx.user.role === 'admin' || ctx.user.role === 'club_admin'
                    ? undefined
                    : or(
                        eq(nieRequests.authorId, ctx.user.id),
                        eq(nieRequests.targetAgentId, ctx.user.id),
                        isNull(nieRequests.targetAgentId)
                    )
            )
            .orderBy(desc(nieRequests.createdAt));

        return requestsData.map(row => ({
            ...row.request,
            author: row.author
        }));
    }),

    updateRequestStatus: protectedProcedure
        .input(z.object({
            id: z.string(),
            status: z.enum(['open', 'in_progress', 'resolved']),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            // Security Check
            let hasAccess = false;
            if (ctx.user.role === 'admin' || ctx.user.role === 'club_admin') {
                hasAccess = true;
            } else {
                const membership = await db.query.nieMemberships.findFirst({
                    where: eq(nieMemberships.userId, ctx.user.id)
                });
                if (membership && membership.status === 'active') hasAccess = true;
            }
            if (!hasAccess) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado.' });

            // Verify if user is author or admin/moderator? 
            // For now, let's assume any agent can update status (cooperation)
            // or maybe restrict to author/admin. 
            // Promoting open cooperation: anyone can mark resolved if they helped? 
            // Let's restrict to author or admin for structure.

            const request = await db.query.nieRequests.findFirst({
                where: eq(nieRequests.id, input.id)
            });

            if (!request) throw new TRPCError({ code: 'NOT_FOUND' });

            if (request.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Only author or admin can update status' });
            }

            await db.update(nieRequests)
                .set({ status: input.status })
                .where(eq(nieRequests.id, input.id));

            return { success: true };
        }),

    getAgents: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        let hasAccess = false;
        if (ctx.user.role === 'admin' || ctx.user.role === 'club_admin') {
            hasAccess = true;
        } else {
            const membership = await db.query.nieMemberships.findFirst({
                where: eq(nieMemberships.userId, ctx.user.id)
            });
            if (membership && membership.status === 'active') hasAccess = true;
        }
        if (!hasAccess) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado.' });

        const memberships = await db.query.nieMemberships.findMany({
            where: eq(nieMemberships.status, 'active'),
            with: {
                user: {
                    columns: {
                        id: true,
                        fullName: true,
                        roadName: true,
                        country: true,
                        role: true,
                        motoClubId: true,
                    },
                    with: {
                        motoClub: {
                            columns: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        const activeAgents = memberships.map(m => m.user);
        const admins = await db.query.users.findMany({
            where: (u, { or, eq, isNull }) => and(
                or(eq(u.role, 'admin'), eq(u.role, 'club_admin')),
                isNull(u.deletedAt)
            ),
            with: {
                motoClub: {
                    columns: {
                        name: true
                    }
                }
            }
        });

        const allAgents = [...activeAgents, ...admins];
        const uniqueAgents = Array.from(new Map(allAgents.map(a => [a.id, a])).values());
        return uniqueAgents;
    }),

    markReportAsRead: protectedProcedure
        .input(z.object({ reportId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return { success: false };

            await db.insert(nieReportReads).values({
                userId: ctx.user.id,
                reportId: input.reportId,
            }).onDuplicateKeyUpdate({
                set: { readAt: new Date() }
            });

            return { success: true };
        }),

    archiveReport: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return { success: false };

            const report = await db.query.nieIntelligenceReports.findFirst({
                where: eq(nieIntelligenceReports.id, input.id)
            });

            if (!report) throw new TRPCError({ code: 'NOT_FOUND' });
            if (report.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Permissão negada.' });
            }

            await db.update(nieIntelligenceReports)
                .set({ status: 'archived' })
                .where(eq(nieIntelligenceReports.id, input.id));

            return { success: true };
        }),

    deleteReport: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return { success: false };

            const report = await db.query.nieIntelligenceReports.findFirst({
                where: eq(nieIntelligenceReports.id, input.id)
            });

            if (!report) throw new TRPCError({ code: 'NOT_FOUND' });
            if (report.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Permissão negada.' });
            }

            await db.update(nieIntelligenceReports)
                .set({ status: 'deleted' })
                .where(eq(nieIntelligenceReports.id, input.id));

            return { success: true };
        }),

    getUnreadCounts: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return { reports: 0, requests: 0 };

        // 1. Reports: count unread active ones
        const allReports = await db.query.nieIntelligenceReports.findMany({
            where: (r, { eq }) => eq(r.status, 'active')
        });
        const readReports = await db.query.nieReportReads.findMany({
            where: (rr, { eq }) => eq(rr.userId, ctx.user.id)
        });
        const readIds = new Set(readReports.map(r => r.reportId));
        const unreadReportsCount = allReports.filter(r => !readIds.has(r.id)).length;

        // 2. Requests: count visible open ones
        const openRequests = await db.query.nieRequests.findMany({
            where: (r, { eq, or, isNull, and }) => {
                const isOpen = eq(r.status, 'open');
                if (ctx.user.role === 'admin') return isOpen;

                const isAuthor = eq(r.authorId, ctx.user.id);
                const isTarget = eq(r.targetAgentId, ctx.user.id);
                const isUntargeted = isNull(r.targetAgentId);

                return and(isOpen, or(isAuthor, isTarget, isUntargeted));
            }
        });

        return {
            reports: unreadReportsCount,
            requests: openRequests.length,
        };
    }),

    refineReportText: protectedProcedure
        .input(z.object({ text: z.string() }))
        .mutation(async ({ input }) => {
            let refined = input.text;

            // Simple "AI-like" heuristics for refinement:
            // 1. Emphasize Dates (DD/MM/YYYY or DD-MM-YYYY)
            refined = refined.replace(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g, '<b>$1</b>');

            // 2. Emphasize suspicious/important keywords (operational terms)
            const keywords = [
                'suspeito', 'veículo', 'placa', 'arma', 'droga', 'entorpecente',
                'indivíduo', 'abordagem', 'incidente', 'conflito', 'facção',
                'monitoramento', 'investigação', 'estratégico', 'crítico'
            ];
            keywords.forEach(word => {
                const regex = new RegExp(`\\b(${word}s?)\\b`, 'gi');
                refined = refined.replace(regex, '<b>$1</b>');
            });

            // 3. Emphasize MCs/Organizations (Assuming UpperCase words of 3+ letters might be ORGs)
            refined = refined.replace(/\b([A-Z]{3,})\b/g, '<b>$1</b>');

            return { refined };
        }),
});
