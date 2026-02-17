import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Lock, FileText, Plus, Search, AlertTriangle, CheckCircle, Users, ExternalLink, Siren, ShieldAlert, Loader2, Building, Globe, Archive, Trash2, Eye, Sparkles, Printer, X, Image } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// DISCLAIMER COMPONENT
const CinDisclaimer = ({ onAccept }: { onAccept: () => void }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-500">
            <div className="max-w-2xl w-full bg-slate-950 border border-slate-800 rounded-lg shadow-2xl p-8 relative overflow-hidden">
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-900 via-amber-500 to-slate-900" />

                <div className="text-center mb-8">
                    <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-amber-500 tracking-wider uppercase">
                        COALITION INTELLIGENCE NETWORK (CIN)
                    </h2>
                    <p className="text-slate-400 text-sm font-bold tracking-widest uppercase mt-2">
                        Protocolo de Cooperação e Inteligência Estratégica
                    </p>
                </div>

                <div className="space-y-6 text-slate-300 text-sm leading-relaxed text-justify px-4">
                    <p>
                        O <strong>CIN</strong> é um canal seguro de comunicação operacional, exclusivo para membros da segurança pública e inteligência que compõem a Coalizão Internacional. Este ambiente blindado possui dupla finalidade:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                            <h3 className="text-amber-500 font-bold mb-2 flex items-center gap-2"><Siren className="w-4 h-4" /> Inteligência de Cenário</h3>
                            <p className="text-xs text-slate-400">Compartilhamento de dados, monitoramento de ameaças e análises táticas sobre o universo e as dinâmicas dos moto clubes.</p>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                            <h3 className="text-blue-500 font-bold mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> Cooperação Internacional</h3>
                            <p className="text-xs text-slate-400">Networking direto entre agências. Ponte ágil para investigações transnacionais e suporte mútuo.</p>
                        </div>
                    </div>

                    <div className="bg-red-950/30 border border-red-900/50 p-6 rounded text-center">
                        <h3 className="text-red-500 font-black uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" /> Classificação de Segurança: Acesso Restrito
                        </h3>
                        <p className="text-xs text-red-200/80">
                            Você está acessando um ambiente auditado. O sigilo das informações aqui transitadas é absoluto. O acesso é concedido exclusivamente por indicação presidencial e qualquer vazamento resultará em sanções severas e exclusão imediata da rede.
                        </p>
                    </div>
                </div>

                <div className="mt-8 px-4">
                    <Button
                        onClick={onAccept}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold tracking-wider uppercase py-6 text-lg shadow-lg hover:shadow-amber-600/20 transition-all border border-amber-500/20"
                    >
                        [ Ciente. Acessar o Cofre ]
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const CinDashboard = () => {
    const { user } = useAuth();
    const utils = trpc.useUtils();

    // Disclaimer State (Session only)
    const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);

    // 1. Check Access and Onboarding Status
    const {
        data: accessStatus,
        isLoading: isCheckingAccess,
        isFetching: isFetchingAccess,
        status: accessQueryStatus,
        error: accessError,
        isError: isAccessError
    } = trpc.cin.getAccessStatus.useQuery(undefined, {
        enabled: hasAcceptedDisclaimer, // Only check after disclaimer
        retry: false,
    });

    // 2. Fetch Data (Dependent on Access)
    const { data: reports, isLoading: isLoadingReports } = trpc.cin.getReports.useQuery(undefined, {
        enabled: !!accessStatus?.hasAccess
    });
    console.log('[CIN Dashboard] Reports data:', reports);
    const { data: requests, isLoading: isLoadingRequests } = trpc.cin.getRequests.useQuery(undefined, {
        enabled: !!accessStatus?.hasAccess
    });

    // 3. Fetch Agents List
    const { data: agents } = trpc.cin.getAgents.useQuery(undefined, {
        enabled: !!accessStatus?.hasAccess
    });

    // 4. Unread Counts for Tab Badges
    const { data: unreadCounts } = trpc.cin.getUnreadCounts.useQuery(undefined, {
        enabled: !!accessStatus?.hasAccess,
        refetchInterval: 30000, // Refresh every 30s
    });

    // States for Dashboard
    const [activeTab, setActiveTab] = useState('reports');
    const [isCreatingReport, setIsCreatingReport] = useState(false);
    const [isCreatingRequest, setIsCreatingRequest] = useState(false);
    const [selectedFullReport, setSelectedFullReport] = useState<any>(null);
    const [refinedContent, setRefinedContent] = useState<string | null>(null);
    const [isRefining, setIsRefining] = useState(false);
    const [reportMediaList, setReportMediaList] = useState<File[]>([]);
    const [reportMediaStrList, setReportMediaStrList] = useState<{ base64: string, name: string, mime: string }[]>([]);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result?.toString().split(',')[1];
                resolve(base64 || '');
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = async (files: FileList | null) => {
        if (!files) return;
        const newFiles = Array.from(files);

        if (reportMediaList.length + newFiles.length > 10) {
            toast.error("Limite máximo de 10 imagens atingido.");
            return;
        }

        const newMediaList = [...reportMediaList, ...newFiles];
        setReportMediaList(newMediaList);

        const newStrList = [...reportMediaStrList];
        for (const file of newFiles) {
            try {
                const base64 = await fileToBase64(file);
                newStrList.push({ base64, name: file.name, mime: file.type });
            } catch (error) {
                toast.error(`Erro ao processar ${file.name}`);
            }
        }
        setReportMediaStrList(newStrList);
    };

    const removeFile = (index: number) => {
        setReportMediaList(prev => prev.filter((_, i) => i !== index));
        setReportMediaStrList(prev => prev.filter((_, i) => i !== index));
    };

    // Form States
    const [reportTitle, setReportTitle] = useState('');
    const [reportContent, setReportContent] = useState('');
    const [reportLinks, setReportLinks] = useState('');
    // New Fields
    const [reportDate, setReportDate] = useState('');
    const [reportClub, setReportClub] = useState('');
    const [reportMedia, setReportMedia] = useState<File | null>(null); // For now just storing file, loop in upload if needed

    const [requestTitle, setRequestTitle] = useState('');
    const [requestDesc, setRequestDesc] = useState('');
    const [requestPriority, setRequestPriority] = useState('medium');
    const [requestType, setRequestType] = useState('mc_issue');
    const [requestTargetAgentId, setRequestTargetAgentId] = useState<string>('all');

    // Mutations
    const createReportMutation = trpc.cin.createReport.useMutation({
        onSuccess: () => {
            setIsCreatingReport(false);
            setReportTitle('');
            setReportContent('');
            setReportLinks('');
            setReportDate('');
            setReportClub('');
            setReportMedia(null);
            utils.cin.getReports.invalidate();
            toast.success("Relatório de Inteligência Produzido.");
        }
    });

    const createRequestMutation = trpc.cin.createRequest.useMutation({
        onSuccess: () => {
            setIsCreatingRequest(false);
            setRequestTitle('');
            setRequestDesc('');
            setRequestTargetAgentId('all');
            utils.cin.getRequests.invalidate();
            utils.cin.getUnreadCounts.invalidate();
            toast.success("Demanda aberta com sucesso.");
        }
    });

    const markAsReadMutation = trpc.cin.markReportAsRead.useMutation({
        onSuccess: () => {
            utils.cin.getReports.invalidate();
            utils.cin.getUnreadCounts.invalidate();
        }
    });

    const refineMutation = trpc.cin.refineReportText.useMutation({
        onSuccess: (data) => {
            setRefinedContent(data.refined);
            setIsRefining(false);
            toast.success("Análise de Inteligência Refinada pela IA!");
        },
        onError: () => {
            setIsRefining(false);
            toast.error("Erro ao refinar análise.");
        }
    });

    const handleRefinate = () => {
        if (!selectedFullReport) return;
        setIsRefining(true);
        refineMutation.mutate({ text: selectedFullReport.content });
    };

    const handlePrint = () => {
        window.print();
    };
    const archiveReportMutation = trpc.cin.archiveReport.useMutation({
        onSuccess: () => {
            utils.cin.getReports.invalidate();
            toast.success("Relatório arquivado.");
        }
    });

    const deleteReportMutation = trpc.cin.deleteReport.useMutation({
        onSuccess: () => {
            utils.cin.getReports.invalidate();
            toast.success("Relatório excluído.");
        }
    });

    const handleCreateReport = async () => {
        if (!reportContent) return;

        let mediaUrl: string | undefined = undefined;
        if (reportLinks) mediaUrl = reportLinks;

        createReportMutation.mutate({
            title: reportTitle || "Relatório de Inteligência",
            content: reportContent,
            sourceLinks: reportLinks,
            eventDate: reportDate,
            involvedClub: reportClub,
            mediaUrl: mediaUrl,
            fileData: reportMediaStrList.length > 0 ? reportMediaStrList : undefined
        });
    };

    const handleCreateRequest = () => {
        if (!requestTitle || !requestDesc) return;
        createRequestMutation.mutate({
            title: requestTitle,
            description: requestDesc,
            priority: requestPriority as any,
            type: requestType as any,
            targetAgentId: requestTargetAgentId === 'all' ? null : parseInt(requestTargetAgentId)
        });
    };

    // --- LOADING STATE ---
    if (isCheckingAccess) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin w-8 h-8 mr-2" /> Estabelecendo Conexão Segura...</div>;
    }

    // --- ACCESS DENIED / ERROR ---
    // Show denied screen if:
    // 1. Explicitly denied (hasAccess === false)
    // 2. An error occurred fetching status
    // 3. Status is missing but we're not loading anymore
    if (!isCheckingAccess && hasAcceptedDisclaimer && (isAccessError || !accessStatus || accessStatus.hasAccess === false)) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6 bg-slate-950 text-slate-200">
                <ShieldAlert className="h-20 w-20 text-red-600 animate-pulse" />
                <h2 className="text-3xl font-bold tracking-widest uppercase text-red-500">
                    {isAccessError ? "Erro de Conexão com o CIN" : "Acesso Restrito ao CIN"}
                </h2>
                <div className="max-w-md text-slate-400 bg-slate-900/50 p-6 rounded-lg border border-red-900/30">
                    <p>Você não possui credenciais de Agente de Inteligência.</p>
                    <p className="mt-4">Solicite sua habilitação ao <strong>Presidente do seu Moto Clube</strong> (Função: Membro CIN) para iniciar o protocolo.</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => window.location.href = '/'}>Retornar à Base</Button>
                </div>
            </div>
        );
    }

    // --- ONBOARDING REQUIRED ---
    if (accessStatus && !accessStatus.isOnboarded) {
        return <CinOnboardingForm />;
    }

    // --- MAIN DASHBOARD (ACCESS GRANTED) ---
    if (!hasAcceptedDisclaimer) {
        return <CinDisclaimer onAccept={() => setHasAcceptedDisclaimer(true)} />;
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 flex items-center gap-3">
                        <Shield className="w-8 h-8" />
                        C.I.N.
                    </h1>
                    <p className="text-slate-400 text-sm font-mono tracking-wider uppercase mt-1">
                        Coalition Intelligence Network
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 px-3 py-1 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                        Status: Ativo
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="reports" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-900 border border-slate-800 p-1">
                    <TabsTrigger value="reports" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-500 text-slate-400 relative">
                        <FileText className="w-4 h-4 mr-2" /> Relatórios
                        {unreadCounts?.reports && unreadCounts.reports > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
                                {unreadCounts.reports}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-500 text-slate-400 relative">
                        <Siren className="w-4 h-4 mr-2" /> Demandas
                        {unreadCounts?.requests && unreadCounts.requests > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                {unreadCounts.requests}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="members" className="data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400 text-slate-400">
                        <Users className="w-4 h-4 mr-2" /> Rede
                    </TabsTrigger>
                </TabsList>

                {/* --- REPORTS TAB --- */}
                <TabsContent value="reports" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-200">Relatórios Recentes</h2>
                        <Button onClick={() => setIsCreatingReport(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Novo Relatório
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {isLoadingReports ? (
                            <div className="p-12 text-center text-slate-500">
                                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-amber-500" />
                                <p>Carregando relatórios...</p>
                            </div>
                        ) : reports && reports.length > 0 ? (
                            reports.map((report) => (
                                <Card key={report.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-lg text-slate-200">{report.title}</CardTitle>
                                                    {!(report as any).isRead && (
                                                        <Badge className="bg-orange-600 text-white animate-pulse">NÃO LIDO</Badge>
                                                    )}
                                                </div>
                                                <CardDescription className="text-slate-500">
                                                    Análise por: {report.author?.fullName || 'Agente'} ({report.author?.roadName || 'CIN'}) • {new Date(report.createdAt ?? new Date()).toLocaleDateString()}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {(user?.role === 'admin' || report.authorId === user?.id) && (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-amber-500"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                archiveReportMutation.mutate({ id: report.id });
                                                            }}
                                                            title="Arquivar"
                                                        >
                                                            <Archive className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-red-500"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("Deseja realmente excluir este relatório?")) {
                                                                    deleteReportMutation.mutate({ id: report.id });
                                                                }
                                                            }}
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                                <Badge variant="secondary" className="bg-slate-800 text-slate-400 h-6">Confidencial</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-slate-400 text-sm whitespace-pre-wrap">
                                            {report.content.split('\n').slice(0, 4).join('\n')}
                                            {report.content.split('\n').length > 4 && '...'}
                                        </div>

                                        <div className="mt-4 flex justify-between items-center">
                                            {report.sourceLinks ? (
                                                <a href={report.sourceLinks} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs flex items-center gap-1">
                                                    <ExternalLink className="w-3 h-3" /> Ver Fontes
                                                </a>
                                            ) : <div />}

                                            <Button
                                                size="sm"
                                                className="bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white border border-amber-500/20 gap-2"
                                                onClick={() => {
                                                    setSelectedFullReport(report);
                                                    if (!(report as any).isRead) {
                                                        markAsReadMutation.mutate({ reportId: report.id });
                                                    }
                                                }}
                                            >
                                                <Eye className="w-4 h-4" /> VER CONTEÚDO
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-lg text-slate-500">
                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Nenhum registro de inteligência disponível.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* --- REQUESTS TAB --- */}
                <TabsContent value="requests" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-200">Demandas de Inteligência (RFI)</h2>
                            <p className="text-sm text-slate-400">Solicitações de informações e cooperação interagências.</p>
                        </div>
                        <Button onClick={() => setIsCreatingRequest(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Abrir Demanda
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {isLoadingRequests ? (
                            <div className="p-12 text-center text-slate-500">
                                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
                                <p>Carregando demandas...</p>
                            </div>
                        ) : requests && requests.length > 0 ? (
                            requests.map((req) => (
                                <Card key={req.id} className="bg-slate-900 border-slate-800 hover:border-slate-700">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`
                                                    ${req.priority === 'critical' ? 'bg-red-900 text-red-300' :
                                                            req.priority === 'high' ? 'bg-orange-900 text-orange-300' :
                                                                req.priority === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-slate-800 text-slate-300'}
                                                `}>
                                                        {(req.priority ?? 'medium').toUpperCase()}
                                                    </Badge>
                                                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                                                        {req.type === 'agency_cooperation' ? 'Cooperação Policial' : 'Assunto Interno MC'}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-lg text-slate-200">{req.title}</CardTitle>
                                                <CardDescription className="text-slate-500">
                                                    Solicitado por: {req.author?.fullName || 'Agente'} ({req.author?.country || 'Rede'}) • {req.author?.orgCategory || 'CIN'} - {req.author?.organName || 'Agência'} • {new Date(req.createdAt ?? new Date()).toLocaleDateString()}
                                                    {req.targetedAgent && (
                                                        <span className="block text-amber-500 font-bold mt-1 uppercase text-[10px] tracking-widest">
                                                            Direcionado a: {req.targetedAgent.fullName} ({req.targetedAgent.roadName || 'Agente'})
                                                        </span>
                                                    )}
                                                </CardDescription>
                                            </div>
                                            <Badge variant={req.status === 'resolved' ? 'default' : 'secondary'} className={req.status === 'resolved' ? 'bg-green-900 text-green-300' : 'bg-blue-900/50 text-blue-300'}>
                                                {req.status === 'open' ? 'EM ABERTO' : req.status === 'in_progress' ? 'EM ANDAMENTO' : 'RESOLVIDO'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{req.description}</p>
                                        <div className="mt-4 flex justify-end">
                                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                                Ver Detalhes / Responder
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-lg text-slate-500">
                                <Siren className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Nenhuma demanda de inteligência ativa.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* --- MEMBERS TAB --- */}
                <TabsContent value="members" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {agents?.map((agent) => (
                            <Card key={agent.id} className="bg-slate-900 border-slate-800">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-100 font-bold truncate">{agent.fullName}</p>
                                        <p className="text-slate-500 text-xs truncate">
                                            {agent.roadName || 'Agente'} • {agent.country}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Building className="w-3 h-3 text-slate-600" />
                                            <p className="text-[10px] text-slate-400 truncate uppercase">{agent.motoClub?.name || 'Comando Global'}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="border-slate-800 text-[10px] text-slate-500">
                                        {agent.role === 'admin' ? 'GLOBAL' : 'AGENTE'}
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={isCreatingReport} onOpenChange={setIsCreatingReport}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-500">
                            <ShieldAlert className="w-5 h-5" />
                            PRODUZIR CONHECIMENTO
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Registre fatos ou ocorrências relevantes para a rede de inteligência.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Data do Evento</label>
                                <Input
                                    type="datetime-local"
                                    max="9999-12-31T23:59"
                                    className="bg-slate-950 border-slate-700 text-slate-400 [color-scheme:dark]"
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Clube Envolvido</label>
                                <Input
                                    className="bg-slate-950 border-slate-700 text-white"
                                    placeholder="Nome do MC / MG"
                                    value={reportClub}
                                    onChange={(e) => setReportClub(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Link Externo (Opcional)</label>
                            <Input
                                value={reportLinks}
                                onChange={e => setReportLinks(e.target.value)}
                                className="bg-slate-950 border-slate-700"
                                placeholder="https://noticias.com/..."
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                Anexos de Mídia (Máx 10)
                                <span className="text-[10px] text-slate-500 normal-case font-normal">{reportMediaList.length}/10 arquivos</span>
                            </label>
                            <Input
                                type="file"
                                accept="image/*"
                                multiple
                                className="bg-slate-950 border-slate-700 text-slate-400 file:bg-slate-800 file:text-amber-500 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md hover:file:bg-slate-700 transition-all cursor-pointer"
                                onChange={(e) => handleFileChange(e.target.files)}
                            />

                            {reportMediaList.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto p-2 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                    {reportMediaList.map((file, idx) => (
                                        <div key={idx} className="relative group bg-slate-900 border border-slate-800 p-2 rounded flex items-center gap-2 overflow-hidden">
                                            <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center shrink-0">
                                                <Image className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <span className="text-[10px] text-slate-400 truncate flex-1">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(idx)}
                                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Relatório Detalhado</label>
                            <Textarea
                                value={reportContent}
                                onChange={e => setReportContent(e.target.value)}
                                className="bg-slate-950 border-slate-700 min-h-[200px]"
                                placeholder="Descreva os fatos com precisão (Limite: 5000 caracteres)..."
                                maxLength={5000}
                            />
                            <p className="text-xs text-slate-500 text-right">{reportContent.length}/5000</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreatingReport(false)}>Cancelar</Button>
                        <Button onClick={handleCreateReport} disabled={createReportMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                            PRODUZIR CONHECIMENTO
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CREATE REQUEST DIALOG */}
            <Dialog open={isCreatingRequest} onOpenChange={setIsCreatingRequest}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Abrir Demanda de Inteligência (RFI)</DialogTitle>
                        <DialogDescription className="text-slate-400">Solicite informações ou cooperação de outros agentes.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Título da Solicitação</label>
                            <Input value={requestTitle} onChange={e => setRequestTitle(e.target.value)} className="bg-slate-950 border-slate-700" placeholder="Ex: Info sobre Indivíduo X em Berlim" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Prioridade</label>
                                <Select value={requestPriority} onValueChange={setRequestPriority}>
                                    <SelectTrigger className="bg-slate-950 border-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectItem value="low">Baixa</SelectItem>
                                        <SelectItem value="medium">Média</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="critical">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Compartilhamento (Need to Know)</label>
                                <Select value={requestTargetAgentId} onValueChange={setRequestTargetAgentId}>
                                    <SelectTrigger className="bg-slate-950 border-slate-700">
                                        <SelectValue placeholder="Toda a Rede" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectItem value="all">Toda a Rede (Público)</SelectItem>
                                        {agents?.filter(a => a.id !== user?.id).map(agent => (
                                            <SelectItem key={agent.id} value={agent.id.toString()}>
                                                {agent.fullName} ({agent.roadName || 'Agente'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Categoria da Demanda</label>
                            <Select value={requestType} onValueChange={setRequestType}>
                                <SelectTrigger className="bg-slate-950 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectItem value="mc_issue">Assunto Interno MC</SelectItem>
                                    <SelectItem value="agency_cooperation">Cooperação Policial / Agências</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Instruções / Necessidade de Informação</label>
                            <Textarea value={requestDesc} onChange={e => setRequestDesc(e.target.value)} className="bg-slate-950 border-slate-700 min-h-[150px]" placeholder="Descreva o que você precisa saber..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreatingRequest(false)}>Cancelar</Button>
                        <Button onClick={handleCreateRequest} disabled={createRequestMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Enviar Solicitação
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* FULL REPORT DIALOG */}
            <Dialog open={!!selectedFullReport} onOpenChange={(open) => {
                if (!open) {
                    setSelectedFullReport(null);
                    setRefinedContent(null);
                }
            }}>
                <DialogContent className="bg-white md:bg-slate-900 border-slate-800 text-slate-950 md:text-slate-100 max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:static">
                    <DialogHeader className="print:hidden">
                        <div className="flex justify-between items-start pr-8">
                            <div>
                                <DialogTitle className="text-2xl text-amber-500 uppercase tracking-wider mb-2">
                                    {selectedFullReport?.title}
                                </DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Análise por: {selectedFullReport?.author?.fullName} ({selectedFullReport?.author?.roadName || 'Agente'})
                                    <br />
                                    Data do Registro: {new Date(selectedFullReport?.createdAt ?? new Date()).toLocaleString('pt-BR')}
                                </DialogDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge className="bg-red-900 text-red-100">ALTAMENTE CONFIDENCIAL</Badge>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-amber-600/50 text-amber-500 hover:bg-amber-600 hover:text-white gap-2"
                                        onClick={handleRefinate}
                                        disabled={isRefining}
                                    >
                                        <Sparkles className={`w-3 h-3 ${isRefining ? 'animate-spin' : ''}`} />
                                        {isRefining ? 'Refinando...' : 'Refinar IA'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-blue-600/50 text-blue-500 hover:bg-blue-600 hover:text-white gap-2"
                                        onClick={handlePrint}
                                    >
                                        <Printer className="w-3 h-3" />
                                        Exportar PDF
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* PRINT-ONLY HEADER (ANONYMOUS) */}
                    <div className="hidden print:block mb-8 border-b-4 border-black pb-6 text-center">
                        <h1 className="text-3xl font-black uppercase tracking-[0.1em] text-black italic">DOCUMENTO DE INTELIGÊNCIA</h1>
                        <p className="text-lg mt-1 text-black font-bold tracking-widest border-t-2 border-black inline-block px-4 pt-1">CONTEÚDO RESERVADO</p>
                    </div>

                    <div className="space-y-6 mt-6 print:mt-0 print:text-black print:space-y-4">
                        {/* ANONYMOUS METADATA FOR PRINT */}
                        <div className="hidden print:grid grid-cols-2 gap-y-2 text-[12px] border-b border-black/20 pb-4 mb-4 font-mono">
                            <div><span className="font-black">ASSUNTO:</span> {selectedFullReport?.title}</div>
                            <div><span className="font-black">CLASSIFICAÇÃO:</span> ESTRITAMENTE CONFIDENCIAL</div>
                            <div><span className="font-black">PROTOCOLO:</span> {selectedFullReport?.id.substring(0, 8).toUpperCase()}</div>
                            <div><span className="font-black">NÍVEL DE ACESSO:</span> OPERACIONAL / CAMPO</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
                            {selectedFullReport?.eventDate && (
                                <div className="bg-slate-950/50 p-4 rounded border border-slate-800 print:bg-transparent print:border-black/20 print:text-black print:p-2">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 print:text-black">Data do Evento</p>
                                    <p className="text-sm text-slate-200 print:text-black">{new Date(selectedFullReport.eventDate).toLocaleString('pt-BR')}</p>
                                </div>
                            )}
                            {selectedFullReport?.involvedClub && (
                                <div className="bg-slate-950/50 p-4 rounded border border-slate-800 print:bg-transparent print:border-black/20 print:text-black print:p-2">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 print:text-black">Clube Envolvido</p>
                                    <p className="text-sm text-slate-200 uppercase print:text-black">{selectedFullReport.involvedClub}</p>
                                </div>
                            )}
                        </div>

                        <div
                            className="bg-slate-950/80 p-6 rounded-lg border border-slate-800 leading-relaxed text-slate-300 whitespace-pre-wrap font-serif text-lg print:bg-transparent print:border-none print:text-black print:p-0 print:text-[14px] print:leading-normal"
                            dangerouslySetInnerHTML={{ __html: refinedContent || selectedFullReport?.content || '' }}
                        />

                        {selectedFullReport?.mediaUrl && (
                            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-2 print:border-black print:bg-transparent">
                                <img
                                    src={selectedFullReport.mediaUrl}
                                    alt="Mídia de Inteligência"
                                    className="max-w-full h-auto mx-auto rounded"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                <p className="text-[10px] text-slate-500 mt-2 text-center uppercase tracking-widest print:text-black">Anexo de Mídia Auditado</p>
                            </div>
                        )}

                        {selectedFullReport?.sourceLinks && (
                            <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded print:border-black print:bg-transparent print:text-black">
                                <p className="text-xs font-bold text-blue-500 uppercase mb-2 print:text-black">Referências e Documentação Anexa</p>
                                <a
                                    href={selectedFullReport.sourceLinks}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-2 break-all print:text-black"
                                >
                                    <ExternalLink className="w-4 h-4 print:hidden" /> {selectedFullReport.sourceLinks}
                                </a>
                            </div>
                        )}
                    </div>

                    {/* PRINT FOOTER */}
                    <div className="hidden print:block mt-12 pt-8 border-t-2 border-black text-[11px] text-center italic space-y-2">
                        <p className="font-bold uppercase tracking-widest">AVISO DE CONFIDENCIALIDADE</p>
                        <p className="max-w-2xl mx-auto">
                            Este documento contém informações classificadas e de uso restrito.
                            <strong> Caso a pessoa que tenha recebido não seja o destinatário da mensagem, favor excluir o documento imediatamente.</strong>
                            A reprodução não autorizada é estritamente proibida e sujeita a penalidades legais.
                        </p>
                    </div>

                    <DialogFooter className="mt-8 print:hidden">
                        <Button variant="outline" onClick={() => {
                            setSelectedFullReport(null);
                            setRefinedContent(null);
                        }} className="border-slate-800 text-slate-400">
                            Fechar Visualização
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* 
                --- DEDICATED PRINT AREA --- 
                This area is only visible for printing and is NOT part of the Dialog portal,
                avoiding blank page issues caused by Radix/Browser print conflicts.
            */}
            <div id="intelligence-report-print-root" className="hidden print:block bg-white text-black p-[1.5cm] min-h-screen">
                {selectedFullReport && (
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-12 border-b-8 border-black pb-8 text-center uppercase">
                            <h1 className="text-4xl font-black tracking-[0.1em] italic text-black leading-tight">DOCUMENTO DE INTELIGÊNCIA</h1>
                            <p className="text-2xl mt-4 font-bold border-t-4 border-black inline-block px-8 pt-2 tracking-widest text-black">CONTEÚDO RESERVADO</p>
                        </div>

                        <div className="grid grid-cols-2 gap-y-4 text-sm border-b-2 border-black/10 pb-6 mb-8 font-mono">
                            <div className="text-black"><span className="font-black">ASSUNTO:</span> {selectedFullReport.title}</div>
                            <div className="text-black"><span className="font-black">CLASSIFICAÇÃO:</span> ESTRITAMENTE CONFIDENCIAL</div>
                            <div className="text-black"><span className="font-black">PROTOCOLO:</span> {selectedFullReport.id.substring(0, 8).toUpperCase()}</div>
                            <div className="text-black"><span className="font-black">NÍVEL DE ACESSO:</span> OPERACIONAL / CAMPO</div>
                            <div className="text-black"><span className="font-black">DATA DO EVENTO:</span> {selectedFullReport.eventDate ? new Date(selectedFullReport.eventDate).toLocaleDateString() : 'N/A'}</div>
                            <div className="text-black"><span className="font-black">CLUBE ENVOLVIDO:</span> {selectedFullReport.involvedClub || 'NÃO IDENTIFICADO'}</div>
                        </div>

                        <div className="text-lg leading-relaxed whitespace-pre-wrap font-serif mb-12 indent-8 text-black">
                            {refinedContent || selectedFullReport.content}
                        </div>

                        {/* PRINT GALLERY */}
                        {selectedFullReport.mediaUrl && (
                            <div className="mt-8 border-2 border-black p-4 break-inside-avoid">
                                <p className="text-[10px] uppercase font-bold mb-4 font-mono text-black border-b border-black pb-2">Anexos de Inteligência Auditados</p>
                                <div className="grid grid-cols-2 gap-4">
                                    {(() => {
                                        try {
                                            const urls = JSON.parse(selectedFullReport.mediaUrl);
                                            if (Array.isArray(urls)) {
                                                return urls.map((url, idx) => (
                                                    <div key={idx} className="border border-black p-1">
                                                        <img src={url} className="w-full h-auto grayscale" alt={`Anexo ${idx + 1}`} />
                                                    </div>
                                                ));
                                            }
                                            return <img src={selectedFullReport.mediaUrl} className="max-w-full h-auto mx-auto grayscale" alt="Anexo" />;
                                        } catch (e) {
                                            return <img src={selectedFullReport.mediaUrl} className="max-w-full h-auto mx-auto grayscale" alt="Anexo" />;
                                        }
                                    })()}
                                </div>
                                <p className="text-[10px] uppercase font-bold mt-4 font-mono text-black text-center">Protocolo de Evidência #{selectedFullReport.id.substring(0, 8).toUpperCase()}</p>
                            </div>
                        )}

                        <div className="mt-20 pt-10 border-t-4 border-black text-xs text-center italic space-y-4 text-black">
                            <p className="font-black text-sm uppercase tracking-[0.3em] text-black">AVISO DE CONFIDENCIALIDADE</p>
                            <p className="max-w-3xl mx-auto leading-loose px-12 text-black">
                                Este documento contém informações classificadas e de uso restrito conforme os protocolos CIN.
                                <strong> Caso a pessoa que tenha recebido não seja o destinatário da mensagem, favor excluir o documento imediatamente.</strong>
                                A reprodução ou compartilhamento não autorizado é estritamente proibido e passível de sanções legais.
                            </p>
                            <p className="text-[10px] mt-8 font-mono tracking-tighter text-black">Doc ID: {selectedFullReport.id}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// COMPONENTE DE ONBOARDING (PRIMEIRO ACESSO)
// ==========================================
const CinOnboardingForm = () => {
    const utils = trpc.useUtils();
    const { data: organs } = trpc.cin.getOrgans.useQuery();

    const [workPhone, setWorkPhone] = useState('');
    const [functionalEmail, setFunctionalEmail] = useState('');
    const [sector, setSector] = useState('');
    const [selectedOrgan, setSelectedOrgan] = useState('');
    const [customOrgan, setCustomOrgan] = useState('');
    const [orgCategory, setOrgCategory] = useState('');

    const ORG_CATEGORIES = [
        "POLÍCIA",
        "DEPARTAMENTO DE TRÂNSITO",
        "EXÉRCITO",
        "MARINHA",
        "AERONÁUTICA",
        "MINISTÉRIO PÚBLICO",
        "PODER JUDICIÁRIO",
        "OUTROS"
    ];

    const submitMutation = trpc.cin.submitOnboarding.useMutation({
        onSuccess: () => {
            toast.success("Credenciamento realizado com sucesso!");
            // Invalida a checagem de acesso para forçar a tela a recarregar o Dashboard oficial
            utils.cin.getAccessStatus.invalidate();
        },
        onError: (err) => {
            toast.error("Erro ao realizar credenciamento: " + err.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalOrganName = selectedOrgan === 'OUTRO' ? customOrgan : selectedOrgan;
        submitMutation.mutate({
            workPhone,
            functionalEmail,
            orgName: finalOrganName,
            orgCategory,
            sector
        });
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 p-4">
            <Card className="border-t-4 border-t-blue-600 shadow-2xl bg-slate-900 border-slate-800 text-slate-200">
                <CardHeader className="bg-slate-950/50 border-b border-slate-800 pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl text-blue-500">
                        <Building className="h-8 w-8" />
                        Credenciamento Operacional
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-2">
                        Seu acesso ao CIN foi autorizado. Por favor, complete seu dossiê operacional.
                        Estes dados serão visíveis para outros agentes visando a cooperação entre agências.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Campo 1: Categoria da Instituição */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Categoria da Instituição *</label>
                            <Select value={orgCategory} onValueChange={setOrgCategory} required>
                                <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-white">
                                    <SelectValue placeholder="Selecione a categoria..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                    {ORG_CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Campo 2: Órgão Governamental */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Órgão Governamental Vinculado *</label>
                            <Select value={selectedOrgan} onValueChange={setSelectedOrgan} required>
                                <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-white">
                                    <SelectValue placeholder="Selecione seu órgão de atuação..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                    {organs?.map(org => (
                                        <SelectItem key={org.id} value={org.name} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="OUTRO" className="text-amber-500 focus:bg-amber-900/20 focus:text-amber-400 cursor-pointer italic font-bold">
                                        + Adicionar Novo Órgão...
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Se escolher "OUTRO", abre o input para digitar o novo */}
                            {selectedOrgan === 'OUTRO' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Input
                                        placeholder="Digite a sigla e o nome (Ex: ABIN - Agência Brasileira de Inteligência)"
                                        value={customOrgan}
                                        onChange={(e) => setCustomOrgan(e.target.value)}
                                        required
                                        className="mt-2 bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Campo 3: Setor */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Setor / Departamento *</label>
                            <Input
                                placeholder="Ex: Divisão de Homicídios, Inteligência Cibernética, Fronteiras..."
                                value={sector}
                                onChange={(e) => setSector(e.target.value)}
                                required
                                className="bg-slate-950 border-slate-700 text-white"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Campo 4: Telefone Funcional / WhatsApp */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Telefone (WhatsApp) *</label>
                                <Input
                                    placeholder="(XX) XXXXX-XXXX"
                                    value={workPhone}
                                    onChange={(e) => setWorkPhone(e.target.value)}
                                    required
                                    className="bg-slate-950 border-slate-700 text-white"
                                />
                            </div>

                            {/* Campo 5: Email Funcional */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">E-mail Funcional *</label>
                                <Input
                                    type="email"
                                    placeholder="exemplo@policiacivil.gov.br"
                                    value={functionalEmail}
                                    onChange={(e) => setFunctionalEmail(e.target.value)}
                                    required
                                    className="bg-slate-950 border-slate-700 text-white"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20" disabled={submitMutation.isPending}>
                                {submitMutation.isPending ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" /> Registrando Credenciais...
                                    </div>
                                ) : 'Confirmar Credenciamento e Acessar CIN'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
