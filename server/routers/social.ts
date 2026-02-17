import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq, and, isNull, or } from "drizzle-orm";
import { posts, comments, likes, users, motoClubs } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";

export const socialRouter = router({
    createPost: protectedProcedure
        .input(z.object({
            title: z.string().max(255).optional(),
            content: z.string().min(1, "A postagem não pode ser vazia"),
            mediaUrl: z.string().optional().or(z.literal("")),
            externalUrl: z.string().optional().or(z.literal("")),
            visibility: z.enum(['public', 'club']).default('public'),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            let targetClubId = null;

            if (input.visibility === 'club') {
                if (!ctx.user.motoClubId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: "Você precisa pertencer a um clube para postar para o clube."
                    });
                }
                targetClubId = ctx.user.motoClubId;
            }

            const newPost = {
                id: crypto.randomUUID(),
                authorId: ctx.user.id,
                title: input.title || null,
                content: input.content,
                mediaUrl: input.mediaUrl || null,
                externalUrl: input.externalUrl || null,
                targetClubId: targetClubId,
                isPinned: false, // Pinned logic can be added later for Admins
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await db.insert(posts).values(newPost);
            return newPost;
        }),

    uploadImage: protectedProcedure
        .input(z.object({
            file: z.string(), // Base64
            mimeType: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Basic validation
            if (!input.mimeType.startsWith('image/')) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas imagens são permitidas.' });
            }

            // Decode Base64
            const buffer = Buffer.from(input.file.replace(/^data:image\/\w+;base64,/, ""), 'base64');

            // Generate filename
            const ext = input.mimeType.split('/')[1] || 'jpg';
            const filename = `posts/${ctx.user.id}/${Date.now()}.${ext}`;

            // Upload using existing storage helper
            try {
                const { url } = await storagePut(filename, buffer, input.mimeType);
                return { url };
            } catch (error: any) {
                console.error("Upload error:", error);
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha no upload da imagem.' });
            }
        }),

    getFeed: protectedProcedure
        .input(z.object({
            clubId: z.number().optional(),
            limit: z.number().min(1).max(50).default(50),
        }))
        .query(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return [];

            const myClubId = ctx.user.motoClubId || null;

            let whereClause;
            if (input.clubId) {
                whereClause = eq(posts.targetClubId, input.clubId);
            } else {
                if (myClubId) {
                    whereClause = or(
                        isNull(posts.targetClubId),
                        eq(posts.targetClubId, myClubId)
                    );
                } else {
                    whereClause = isNull(posts.targetClubId);
                }
            }

            console.log(`[getFeed] Fetching posts with clubId=${myClubId} and inputClub=${input.clubId}`);

            // 1. Fetch Posts and Authors
            const rows = await db.select({
                post: posts,
                author: {
                    id: users.id,
                    name: users.name,
                    fullName: users.fullName,
                    roadName: users.roadName,
                    profilePhotoUrl: users.profilePhotoUrl,
                    role: users.role,
                    motoClubId: users.motoClubId,
                },
                club: {
                    name: motoClubs.name,
                }
            })
                .from(posts)
                .leftJoin(users, eq(posts.authorId, users.id))
                .leftJoin(motoClubs, eq(users.motoClubId, motoClubs.id))
                .where(whereClause)
                .orderBy(desc(posts.createdAt))
                .limit(input.limit);

            console.log(`[getFeed] Rows found: ${rows.length}`);

            if (rows.length === 0) return [];

            const postIds = rows.map(r => r.post.id);

            // 2. Fetch Likes (Count & HasLiked)
            const allLikes = await db.select().from(likes).where(or(...postIds.map(id => eq(likes.postId, id))));

            // 3. Fetch Comments (Count)
            const allComments = await db.select({ id: comments.id, postId: comments.postId }).from(comments).where(or(...postIds.map(id => eq(comments.postId, id))));

            // 4. Merge
            return rows.map(({ post, author, club }) => {
                const postLikes = allLikes.filter(l => l.postId === post.id);
                const postComments = allComments.filter(c => c.postId === post.id);

                return {
                    ...post,
                    author: {
                        ...(author || {
                            id: -1,
                            name: 'Unknown',
                            fullName: 'Unknown',
                            roadName: null,
                            profilePhotoUrl: null,
                            role: 'user',
                            motoClubId: null,
                        }),
                        clubName: club?.name || null,
                    },
                    likeCount: postLikes.length,
                    commentCount: postComments.length,
                    hasLiked: postLikes.some(l => l.userId === ctx.user.id),
                };
            });
        }),

    toggleLike: protectedProcedure
        .input(z.object({ postId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            const existingLike = await db.query.likes.findFirst({
                where: and(
                    eq(likes.postId, input.postId),
                    eq(likes.userId, ctx.user.id)
                )
            });

            if (existingLike) {
                // Unlike
                await db.delete(likes).where(and(
                    eq(likes.postId, input.postId),
                    eq(likes.userId, ctx.user.id)
                ));
                return { liked: false };
            } else {
                // Like
                await db.insert(likes).values({
                    postId: input.postId,
                    userId: ctx.user.id,
                });
                return { liked: true };
            }
        }),

    addComment: protectedProcedure
        .input(z.object({
            postId: z.string(),
            content: z.string().min(1, "O comentário não pode ser vazio").max(500),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            const newCommentId = crypto.randomUUID();

            const newComment = {
                id: newCommentId,
                postId: input.postId,
                authorId: ctx.user.id,
                content: input.content,
                createdAt: new Date(),
            };

            await db.insert(comments).values(newComment);
            return { success: true, commentId: newCommentId };
        }),

    // Delete Post (Author, Club President, or Admin)
    deletePost: protectedProcedure
        .input(z.object({ postId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            const post = (await db.select().from(posts).where(eq(posts.id, input.postId)).limit(1))[0];
            if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });

            // Permissions Check
            const isAuthor = post.authorId === ctx.user.id;
            const isAdmin = ctx.user.role === 'admin';
            const isClubPresident = ctx.user.role === 'club_admin' && ctx.user.motoClubId === post.targetClubId;

            if (!isAuthor && !isAdmin && !isClubPresident) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to delete this post.' });
            }

            // Delete related (likes, comments) - Manual cascade if not set in DB
            await db.delete(likes).where(eq(likes.postId, input.postId));
            await db.delete(comments).where(eq(comments.postId, input.postId));
            await db.delete(posts).where(eq(posts.id, input.postId));

            return { success: true };
        }),

    // Edit Post (Author only)
    editPost: protectedProcedure
        .input(z.object({
            postId: z.string(),
            title: z.string().max(255).optional(),
            content: z.string().min(1, "Post content cannot be empty"),
            mediaUrl: z.string().optional(),
            externalUrl: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            const post = (await db.select().from(posts).where(eq(posts.id, input.postId)).limit(1))[0];
            if (!post) throw new TRPCError({ code: 'NOT_FOUND' });

            if (post.authorId !== ctx.user.id) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the author can edit this post.' });
            }

            await db.update(posts)
                .set({
                    title: input.title !== undefined ? input.title : post.title,
                    content: input.content,
                    mediaUrl: input.mediaUrl !== undefined ? input.mediaUrl : post.mediaUrl,
                    externalUrl: input.externalUrl !== undefined ? input.externalUrl : post.externalUrl,
                    updatedAt: new Date()
                })
                .where(eq(posts.id, input.postId));

            return { success: true };
        }),

    getPostComments: protectedProcedure
        .input(z.object({ postId: z.string() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return [];

            const results = await db.select({
                id: comments.id,
                postId: comments.postId,
                content: comments.content,
                createdAt: comments.createdAt,
                author: {
                    id: users.id,
                    name: users.name,
                    fullName: users.fullName,
                    roadName: users.roadName,
                    profilePhotoUrl: users.profilePhotoUrl,
                }
            })
                .from(comments)
                .leftJoin(users, eq(comments.authorId, users.id))
                .where(eq(comments.postId, input.postId))
                .orderBy(desc(comments.createdAt));

            return results.map(r => ({
                ...r,
                author: r.author || { id: -1, name: 'Unknown', fullName: 'Unknown', roadName: null, profilePhotoUrl: null }
            }));
        })
});
