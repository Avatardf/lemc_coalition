import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Image, Link as LinkIcon, Loader2, X, Camera } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EditPostDialogProps {
    post: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    currentUser?: any;
}

export const EditPostDialog = ({ post, open, onOpenChange, onSuccess, currentUser }: EditPostDialogProps) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [externalUrl, setExternalUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Inputs refs
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Toggle for inputs
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [showTitleInput, setShowTitleInput] = useState(false);

    // Initialize with post data
    useEffect(() => {
        if (post && open) {
            setTitle(post.title || '');
            setContent(post.content || '');
            setMediaUrl(post.mediaUrl || '');
            setExternalUrl(post.externalUrl || '');
            setShowTitleInput(!!post.title);
            setShowLinkInput(!!post.externalUrl);
        }
    }, [post, open]);

    const editPostMutation = trpc.social.editPost.useMutation({
        onSuccess: () => {
            toast.success("Publicação atualizada!");
            onSuccess();
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error("Erro ao editar: " + err.message);
        }
    });

    const uploadImageMutation = trpc.social.uploadImage.useMutation({
        onSuccess: (data) => {
            setMediaUrl(data.url);
            setIsUploading(false);
            toast.success("Imagem carregada!");
        },
        onError: (err) => {
            setIsUploading(false);
            toast.error("Erro ao carregar imagem: " + err.message);
        }
    });

    const handleSave = () => {
        if (!content.trim()) {
            toast.error("O conteúdo da postagem não pode ser vazio.");
            return;
        }
        if (isUploading) {
            toast.error("Aguarde o upload da imagem terminar.");
            return;
        }

        editPostMutation.mutate({
            postId: post.id,
            title: title.trim() || undefined,
            content,
            mediaUrl: mediaUrl.trim() || undefined,
            externalUrl: externalUrl.trim() || undefined,
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecione um arquivo de imagem.');
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            uploadImageMutation.mutate({
                file: base64String,
                mimeType: file.type
            });
        };
        reader.readAsDataURL(file);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-black text-white border-white/10 p-0 overflow-hidden gap-0 shadow-2xl">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <button onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                        <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Editar Publicação</span>
                    </div>
                </div>

                <div className="flex gap-4 p-4">
                    <Avatar className="w-10 h-10 border border-white/10 shrink-0">
                        <AvatarImage src={currentUser?.profilePhotoUrl || undefined} />
                        <AvatarFallback>{currentUser?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4">
                        <div className="space-y-3">
                            {showTitleInput && (
                                <Input
                                    placeholder="Título (Opcional)"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="border-none bg-transparent text-xl font-bold px-0 placeholder:text-slate-500 focus-visible:ring-0"
                                />
                            )}

                            <Textarea
                                placeholder="Edit your message..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[150px] bg-transparent border-none text-xl resize-none px-0 placeholder:text-slate-500 focus-visible:ring-0"
                            />

                            {isUploading && (
                                <div className="h-40 w-full bg-slate-900/50 rounded-xl flex items-center justify-center border border-white/10 animate-pulse">
                                    <div className="flex flex-col items-center gap-2 text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        <span className="text-xs font-medium">Atualizando imagem...</span>
                                    </div>
                                </div>
                            )}

                            {!isUploading && mediaUrl && (
                                <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                                    <img
                                        src={mediaUrl}
                                        alt="Preview"
                                        className="w-full h-auto max-h-[300px] object-cover"
                                    />
                                    <button
                                        onClick={() => setMediaUrl('')}
                                        className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {showLinkInput && (
                                <Input
                                    placeholder="https://external-link.com"
                                    value={externalUrl}
                                    onChange={(e) => setExternalUrl(e.target.value)}
                                    className="bg-slate-900/50 border-white/10 text-blue-400 focus:border-blue-500/50"
                                />
                            )}
                        </div>

                        <div className="border-t border-white/10 my-2" />

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={galleryInputRef}
                            onChange={handleFileSelect}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={cameraInputRef}
                            onChange={handleFileSelect}
                        />

                        <div className="flex justify-between items-center pt-2">
                            <div className="flex gap-2 text-blue-400">
                                <button
                                    onClick={() => galleryInputRef.current?.click()}
                                    title="Galeria"
                                    className="p-2 hover:bg-blue-400/10 rounded-full transition-colors"
                                    disabled={isUploading}
                                >
                                    <Image className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => cameraInputRef.current?.click()}
                                    title="Câmera"
                                    className="p-2 hover:bg-blue-400/10 rounded-full transition-colors"
                                    disabled={isUploading}
                                >
                                    <Camera className="w-5 h-5" />
                                </button>
                                <button onClick={() => setShowLinkInput(!showLinkInput)} title="Link Externo" className="p-2 hover:bg-blue-400/10 rounded-full transition-colors">
                                    <LinkIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setShowTitleInput(!showTitleInput)} title="Adicionar Título" className="p-2 hover:bg-blue-400/10 rounded-full transition-colors font-bold text-sm h-9 w-9 flex items-center justify-center">
                                    T
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                    className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={editPostMutation.isPending || !content.trim() || isUploading}
                                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold px-8 shadow-lg shadow-blue-500/20"
                                >
                                    {editPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
