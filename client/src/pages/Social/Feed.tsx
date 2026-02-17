import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Users, Megaphone, PlusCircle, ExternalLink, Shield, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { PostInteractions } from '@/components/PostInteractions';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import { EditPostDialog } from '@/components/EditPostDialog';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const SocialFeed = () => {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<any>(null);
    const utils = trpc.useContext();
    const { data: currentUser } = trpc.auth.me.useQuery();
    const { data: feedPosts, isLoading } = trpc.social.getFeed.useQuery({});

    const deletePostMutation = trpc.social.deletePost.useMutation({
        onSuccess: () => {
            toast.success("Post removido com sucesso.");
            utils.social.getFeed.invalidate();
        },
        onError: (err) => {
            toast.error("Erro ao remover post", { description: err.message });
        }
    });

    const handleDelete = (postId: string) => {
        if (confirm("Tem certeza que deseja excluir esta publicação?")) {
            deletePostMutation.mutate({ postId });
        }
    };

    const handleSuccess = () => {
        utils.social.getFeed.invalidate();
    };

    if (isLoading) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto border-x border-white/10 min-h-screen bg-black/20">
            {/* Header / Compose Prompt */}
            <div className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Home</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setIsCreateDialogOpen(true)}
                >
                    <PlusCircle className="text-blue-500" />
                </Button>
            </div>

            {/* Desktop Composer Prompt */}
            <div className="hidden md:flex p-4 border-b border-white/10 gap-4">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={currentUser?.profilePhotoUrl} />
                    <AvatarFallback>{currentUser?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div
                        className="bg-transparent text-slate-500 text-xl cursor-text py-2"
                        onClick={() => setIsCreateDialogOpen(true)}
                    >
                        What is happening?!
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold px-6"
                        >
                            Post
                        </Button>
                    </div>
                </div>
            </div>

            <CreatePostDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={handleSuccess}
                isGlobalAllowed={currentUser?.role === 'admin'}
                currentUser={currentUser || undefined}
            />

            <EditPostDialog
                post={editingPost}
                open={!!editingPost}
                onOpenChange={(open) => !open && setEditingPost(null)}
                onSuccess={handleSuccess}
                currentUser={currentUser || undefined}
            />

            {/* FEED */}
            <div>
                {feedPosts?.map((post: any) => {
                    const isGlobal = post.targetClubId === null;
                    const isAuthor = currentUser?.id === post.authorId;
                    const isAdmin = currentUser?.role === 'admin';
                    const isClubPresident = currentUser?.role === 'club_admin' && currentUser?.motoClubId === post.targetClubId;
                    const canDelete = isAuthor || isAdmin || isClubPresident;

                    return (
                        <article
                            key={post.id}
                            className="p-4 border-b border-slate-800 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                            <div className="flex gap-4">
                                {/* Left: Avatar */}
                                <div className="shrink-0">
                                    <Avatar className="w-10 h-10 border border-white/10">
                                        <AvatarImage src={post.author.profilePhotoUrl || undefined} />
                                        <AvatarFallback>{post.author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </div>

                                {/* Right: Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-center justify-between text-slate-500 text-sm mb-1">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <span className="font-bold text-white truncate text-base uppercase">
                                                {post.author.roadName || post.author.fullName || post.author.name}
                                            </span>
                                            {post.author.clubName && (
                                                <span className="text-blue-400 text-xs font-bold uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 truncate">
                                                    {post.author.clubName}
                                                </span>
                                            )}
                                            <span className="shrink-0 text-slate-600">·</span>
                                            <span className="hover:underline shrink-0 text-slate-500 text-xs">
                                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}
                                            </span>
                                        </div>

                                        {/* Actions & Badges */}
                                        <div className="shrink-0 flex items-center gap-2">
                                            {isGlobal ? (
                                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px] px-1.5 h-5">
                                                    <Globe className="w-3 h-3 mr-1" /> GLOBAL
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px] px-1.5 h-5">
                                                    <Shield className="w-3 h-3 mr-1" /> {currentUser?.motoClubId === post.targetClubId ? 'CLUB' : 'PRIVATE'}
                                                </Badge>
                                            )}

                                            {/* Dropdown Menu for Actions */}
                                            {canDelete && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-slate-800 text-slate-500">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-black border-slate-800 text-white">
                                                        {isAuthor && (
                                                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-800" onClick={() => setEditingPost(post)}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Editar
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="cursor-pointer text-red-500 hover:bg-red-900/20 hover:text-red-400 focus:text-red-400 focus:bg-red-900/20"
                                                            onClick={() => handleDelete(post.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>

                                    {/* Post Body */}
                                    {post.title && (
                                        <h3 className="font-bold text-white text-lg mb-1 leading-tight">{post.title}</h3>
                                    )}

                                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-[15px] mb-3">
                                        {post.content}
                                    </p>

                                    {/* Media */}
                                    {post.mediaUrl && (
                                        <div className="mt-2 mb-3 rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-[3/4] max-w-sm">
                                            <img
                                                src={post.mediaUrl}
                                                alt="Post attachment"
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* External Link */}
                                    {post.externalUrl && (
                                        <a
                                            href={post.externalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block mt-2 mb-3 rounded-xl border border-white/10 overflow-hidden hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="bg-slate-900/50 p-3 flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                    <ExternalLink className="w-5 h-5" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="text-sm font-medium text-slate-300 group-hover:text-blue-400 truncate">
                                                        {post.externalUrl}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {new URL(post.externalUrl).hostname}
                                                    </div>
                                                </div>
                                            </div>
                                        </a>
                                    )}

                                    {/* Footer Actions */}
                                    <div className="mt-1">
                                        <PostInteractions
                                            postId={post.id}
                                            initialLikesCount={post.likeCount}
                                            initialHasLiked={post.hasLiked}
                                            initialCommentsCount={post.commentCount}
                                        />
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}

                {feedPosts?.length === 0 && (
                    <div className="text-center py-20 px-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 mb-4">
                            <Megaphone className="w-8 h-8 text-slate-700" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Welcome to the Coalition Feed</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            This is where you'll see updates from the High Administration and your Moto Club.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
