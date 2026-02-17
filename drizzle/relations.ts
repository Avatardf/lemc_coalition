import { relations } from "drizzle-orm";
import { users, motoClubs, posts, comments, likes, nieMemberships, nieIntelligenceReports, userInfractions, motorcycles, passportCheckIns, membershipRequests, chapters, nieRequests } from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
    motoClub: one(motoClubs, {
        fields: [users.motoClubId],
        references: [motoClubs.id],
    }),
    posts: many(posts),
    comments: many(comments),
    likes: many(likes),
    motorcycles: many(motorcycles),
}));

export const motoClubsRelations = relations(motoClubs, ({ many, one }) => ({
    members: many(users),
    chapters: many(chapters),
    posts: many(posts), // posts on club wall
    president: one(users, {
        fields: [motoClubs.presidentId],
        references: [users.id],
    }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
    author: one(users, {
        fields: [posts.authorId],
        references: [users.id],
    }),
    targetClub: one(motoClubs, {
        fields: [posts.targetClubId],
        references: [motoClubs.id],
    }),
    comments: many(comments),
    likes: many(likes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
    post: one(posts, {
        fields: [comments.postId],
        references: [posts.id],
    }),
    author: one(users, {
        fields: [comments.authorId],
        references: [users.id],
    }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
    post: one(posts, {
        fields: [likes.postId],
        references: [posts.id],
    }),
    user: one(users, {
        fields: [likes.userId],
        references: [users.id],
    }),
}));

export const nieIntelligenceReportsRelations = relations(nieIntelligenceReports, ({ one }) => ({
    author: one(users, {
        fields: [nieIntelligenceReports.authorId],
        references: [users.id],
    }),
}));

export const userInfractionsRelations = relations(userInfractions, ({ one }) => ({
    user: one(users, {
        fields: [userInfractions.userId],
        references: [users.id],
        relationName: "infraction_target"
    }),
    appliedBy: one(users, {
        fields: [userInfractions.appliedById],
        references: [users.id],
        relationName: "infraction_applier"
    }),
}));

export const nieRequestsRelations = relations(nieRequests, ({ one }) => ({
    author: one(users, {
        fields: [nieRequests.authorId],
        references: [users.id],
        relationName: "request_author"
    }),
    targetedAgent: one(users, {
        fields: [nieRequests.targetAgentId],
        references: [users.id],
        relationName: "request_target"
    }),
}));

export const nieMembershipsRelations = relations(nieMemberships, ({ one }) => ({
    user: one(users, {
        fields: [nieMemberships.userId],
        references: [users.id],
    }),
    nominatedBy: one(users, {
        fields: [nieMemberships.nominatedById],
        references: [users.id],
    }),
}));
