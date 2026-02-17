import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { getCountryFlagUrl } from "@shared/countries";

export default function Onboarding() {
    const { user, logout } = useAuth();
    const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
    const [, setLocation] = useLocation();

    const { data: allClubs, isLoading: clubsLoading } = trpc.motoClubs.list.useQuery();
    const { data: myRequest, isLoading: requestLoading, refetch: refetchRequest } = trpc.motoClubs.getMyPendingRequest.useQuery();

    const requestMutation = trpc.motoClubs.requestMembership.useMutation({
        onSuccess: () => {
            toast.success("Solicitação enviada com sucesso!");
            refetchRequest();
        },
        onError: (err) => toast.error(err.message)
    });

    if (clubsLoading || requestLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;
    }

    // If user is already approved, redirect to home
    if (user?.membershipStatus === 'approved') {
        setLocation('/');
        return null;
    }

    // If user has a pending request
    if (myRequest) {
        const clubName = allClubs?.find(c => c.id === myRequest.motoClubId)?.name || 'Clube desconhecido';

        return (
            <div className="min-h-screen flex items-center justify-center bg-[url('/road-background.jpg')] bg-cover bg-center p-4">
                <div className="absolute inset-0 bg-black/80" />
                <Card className="z-10 w-full max-w-md bg-slate-900/90 border-slate-800 text-slate-100 backdrop-blur-sm">
                    <CardHeader className="text-center pb-2">
                        <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <CardTitle className="text-2xl font-bold text-amber-500">Aguardando Aprovação</CardTitle>
                        <CardDescription className="text-slate-400">
                            Sua solicitação foi enviada para o Presidente do moto clube.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                            <p className="text-sm text-slate-400 mb-1">Clube Solicitado</p>
                            <p className="font-bold text-lg text-white">{clubName}</p>
                            <Badge variant="outline" className="mt-2 text-amber-500 border-amber-500/30 bg-amber-500/10">
                                Pendente
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                            Você receberá acesso ao painel assim que sua solicitação for aprovada.
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800" onClick={logout}>
                            Sair / Trocar Conta
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Allows user to select a club
    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('/road-background.jpg')] bg-cover bg-center p-4">
            <div className="absolute inset-0 bg-black/80" />

            <Card className="z-10 w-full max-w-2xl bg-slate-900/90 border-slate-800 text-slate-100 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <CardTitle className="text-2xl font-bold text-white">Escolha seu Moto Clube</CardTitle>
                    <CardDescription className="text-slate-400">
                        Para acessar a Coalizão, você precisa se vincular a um Moto Clube.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {allClubs?.map(club => (
                            <div
                                key={club.id}
                                className={`
                                    relative p-4 rounded-lg border cursor-pointer transition-all hover:bg-slate-800/80
                                    ${selectedClubId === club.id
                                        ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500'
                                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}
                                `}
                                onClick={() => setSelectedClubId(club.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                                        {club.logoUrl ? (
                                            <img src={club.logoUrl} alt={club.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-slate-400">{club.name.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{club.name}</p>
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            {getCountryFlagUrl(club.country) && (
                                                <img src={getCountryFlagUrl(club.country)!} className="w-3 h-auto grayscale opacity-70" alt="" />
                                            )}
                                            <span>{club.country}</span>
                                        </div>
                                    </div>
                                    {selectedClubId === club.id && (
                                        <CheckCircle2 className="h-5 w-5 text-amber-500 absolute top-3 right-3" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                    <Button
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 text-lg"
                        disabled={!selectedClubId || requestMutation.isPending}
                        onClick={() => {
                            if (selectedClubId) requestMutation.mutate({ motoClubId: selectedClubId });
                        }}
                    >
                        {requestMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : 'SOLICITAR ENTRADA'}
                    </Button>
                    <Button variant="ghost" className="text-slate-500 hover:text-white" onClick={logout}>
                        Cancelar / Sair
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
