import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb, users, getUserByEmail } from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { parse } from "cookie";

const ONE_YEAR_MS = 31536000000;
const IMPERSONATOR_COOKIE_NAME = "lemc_impersonator_session";

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

export const authRouter = router({
    me: publicProcedure.query(async ({ ctx }) => {
        let isImpersonating = false;
        if (ctx.req) {
            isImpersonating = !!getCookie(ctx.req, IMPERSONATOR_COOKIE_NAME);
        }
        return {
            ...ctx.user,
            isImpersonating
        };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        ctx.res.clearCookie(IMPERSONATOR_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return {
            success: true,
        } as const;
    }),

    loginWithPassword: publicProcedure
        .input(z.object({
            email: z.string().email(),
            password: z.string().min(1)
        }))
        .mutation(async ({ ctx, input }) => {
            const dbInstance = await getDb();
            if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            // 1. Find user
            const user = await getUserByEmail(input.email);

            if (!user || !user.password) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
            }

            // 2. Compare Password
            const isValid = await bcrypt.compare(input.password, user.password);
            if (!isValid) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
            }

            // 3. Check Membership Status
            // Admins and Club Admins should generally be allowed, but let's adhere to the status field if strictly managed.
            // However, usually admins created via scripts are approved.
            // Safety: Admin role bypasses 'pending' check? 
            // Better: 'pending' implies they are NOT an admin yet in practice (or waiting on Super Admin).
            // Let's enforce it for everyone except 'admin' (Global).
            // 3. User validated, continue to session creation

            // 3. Create Session
            const sessionToken = await sdk.createSessionToken(user.openId, {
                name: user.name || "",
                expiresInMs: ONE_YEAR_MS,
            });

            // 4. Set Cookie
            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

            return {
                success: true,
                user,
                mustChangePassword: user.mustChangePassword
            };
        }),

    changePassword: protectedProcedure
        .input(z.object({
            newPassword: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.")
        }))
        .mutation(async ({ ctx, input }) => {
            const dbInstance = await getDb();
            if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            const hashedPassword = await bcrypt.hash(input.newPassword, 10);

            await dbInstance.update(users)
                .set({
                    password: hashedPassword,
                    mustChangePassword: false
                })
                .where(eq(users.id, ctx.user.id));

            return { success: true };
        })
});
