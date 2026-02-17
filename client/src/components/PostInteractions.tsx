import React, { useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PostInteractionsProps {
    postId: string;
    initialLikesCount: number;
    initialHasLiked: boolean;
    initialCommentsCount: number;
}

export const PostInteractions = ({
    postId,
    initialLikesCount,
    initialHasLiked,
    initialCommentsCount
}: PostInteractionsProps) => {
    const [likesCount, setLikesCount] = useState(initialLikesCount);
    const [hasLiked, setHasLiked] = useState(initialHasLiked);
    const utils = trpc.useContext();

    const toggleLikeMutation = trpc.social.toggleLike.useMutation({
        onMutate: async () => {
            // Optimistic update
            const newHasLiked = !hasLiked;
            setHasLiked(newHasLiked);
            setLikesCount(prev => newHasLiked ? prev + 1 : prev - 1);
        },
        onError: (err) => {
            // Rollback on error
            setHasLiked(initialHasLiked);
            setLikesCount(initialLikesCount);
            toast.error("Erro ao curtir postagem", { description: err.message });
        },
        onSuccess: () => {
            utils.social.getFeed.invalidate();
        }
    });

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleLikeMutation.mutate({ postId });
    };

    const handleComment = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Comment drawer/dialog logic would go here
        toast.info("A funcionalidade de comentários será expandida em breve.");
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copiado para a área de transferência!");
    };

    return (
        <div className="flex items-center justify-between max-w-md text-slate-500">
            <button
                onClick={handleComment}
                className="group flex items-center gap-2 hover:text-blue-500 transition-colors"
            >
                <div className="p-2 group-hover:bg-blue-500/10 rounded-full transition-colors">
                    <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-sm">{initialCommentsCount}</span>
            </button>

            <button
                onClick={handleLike}
                className={cn(
                    "group flex items-center gap-2 transition-colors",
                    hasLiked ? "text-pink-500" : "hover:text-pink-500"
                )}
            >
                <div className={cn(
                    "p-2 rounded-full transition-colors",
                    hasLiked ? "bg-pink-500/10" : "group-hover:bg-pink-500/10"
                )}>
                    <Heart className={cn("w-5 h-5", hasLiked && "fill-current")} />
                </div>
                <span className="text-sm">{likesCount}</span>
            </button>

            <button
                onClick={handleShare}
                className="group flex items-center gap-2 hover:text-green-500 transition-colors"
            >
                <div className="p-2 group-hover:bg-green-500/10 rounded-full transition-colors">
                    <Share2 className="w-5 h-5" />
                </div>
            </button>
        </div>
    );
};
