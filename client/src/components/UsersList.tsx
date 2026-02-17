import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, Pencil, Plus, X } from 'lucide-react';

import { COUNTRIES, getCountryFlagUrl } from '@shared/countries';

export function UsersList() {
    const utils = trpc.useUtils();
    const { user: currentUser } = useAuth();

    // Filters State
    const [filterClubId, setFilterClubId] = useState<number | undefined>(undefined);
    const [filterCountry, setFilterCountry] = useState<string>('');
    const [filterRole, setFilterRole] = useState<string>('all');

    // Role Edit State
    const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState<string>('user');

    // Queries
    const { data: users, isLoading, error } = trpc.admin.listUsers.useQuery({
        motoClubId: filterClubId,
        country: filterCountry || undefined,
        role: filterRole !== 'all' ? (filterRole as any) : undefined
    }, {
        retry: false // Disable retries to see errors immediately
    });

    const { data: clubs } = trpc.motoClubs.list.useQuery();

    // Auto-select club for Club Admins
    useEffect(() => {
        if (currentUser?.role === 'club_admin' || currentUser?.role === 'club_officer') {
            setFilterClubId(currentUser.motoClubId || undefined);
        }
    }, [currentUser]);

    const impersonateMutation = trpc.admin.impersonateUser.useMutation({
        onSuccess: () => {
            toast.success("Impersonating user...");
            window.location.href = '/';
        },
        onError: (error) => toast.error(error.message)
    });

    const removeMemberMutation = trpc.admin.removeMember.useMutation({
        onSuccess: () => {
            toast.success("Member removed successfully");
            utils.admin.listUsers.invalidate();
        },
        onError: (error) => toast.error(error.message)
    });

    const assignRoleMutation = trpc.admin.updateUserRole.useMutation({
        onSuccess: () => {
            toast.success("User role updated successfully");
            setEditRoleDialogOpen(false);
            utils.admin.listUsers.invalidate();
        },
        onError: (error) => toast.error(error.message)
    });

    const clearFilters = () => {
        setFilterClubId(undefined);
        setFilterCountry('');
        setFilterRole('all');
    };

    const handleImpersonate = (userId: number) => {
        if (confirm("Are you sure you want to login as this user?")) {
            impersonateMutation.mutate({ userId });
        }
    };

    const handleRemoveMember = (userId: number) => {
        if (confirm("Are you sure you want to remove this user? This action cannot be undone.")) {
            removeMemberMutation.mutate({ userId });
        }
    };

    const handleEditRoleClick = (user: any) => {
        setSelectedUser(user);
        if (user.role === 'admin') setSelectedRole('admin_geral');
        else if (user.role === 'club_admin') setSelectedRole('presidente');
        else if (user.role === 'club_officer') setSelectedRole('membro_admin');
        else if (user.isCinMember) setSelectedRole('membro_cin');
        else setSelectedRole('membro');
        setEditRoleDialogOpen(true);
    };

    const handleSaveRole = () => {
        if (!selectedUser) return;
        let role: 'user' | 'club_admin' | 'admin' | 'club_officer' = 'user';
        let isCinMember = false;
        switch (selectedRole) {
            case 'admin_geral': role = 'admin'; break;
            case 'presidente': role = 'club_admin'; break;
            case 'membro_admin': role = 'club_officer'; break;
            case 'membro_cin': role = 'user'; isCinMember = true; break;
            default: role = 'user'; break;
        }
        assignRoleMutation.mutate({ userId: selectedUser.id, role, isCinMember });
    };

    const getRoleBadge = (user: any) => {
        if (user.role === 'admin') return <Badge className="bg-red-600">Admin Geral</Badge>;
        if (user.role === 'club_admin') return <Badge className="bg-blue-600">Presidente</Badge>;
        if (user.role === 'club_officer') return <Badge className="bg-purple-600">Membro Admin</Badge>;
        if (user.isCinMember) return <Badge className="bg-amber-500">Membro CIN</Badge>;
        return <Badge variant="outline">Membro</Badge>;
    };

    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [newUserData, setNewUserData] = useState({
        name: '', email: '', roadName: '', role: 'user' as any, motoClubId: undefined as number | undefined, country: ''
    });

    const createUserMutation = trpc.admin.createUser.useMutation({
        onSuccess: () => {
            toast.success("Membro criado com sucesso!");
            setAddUserDialogOpen(false);
            utils.admin.listUsers.invalidate();
        },
        onError: (error) => toast.error(error.message)
    });

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        createUserMutation.mutate({ ...newUserData, motoClubId: newUserData.motoClubId || undefined });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Gestão de Membros</h2>
                <Button onClick={() => setAddUserDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    <Plus className="h-4 w-4 mr-2" />
                    ADICIONAR MEMBRO
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2 min-w-[200px]">
                    <Label>Moto Club</Label>
                    <Select
                        value={filterClubId ? String(filterClubId) : "all"}
                        onValueChange={(val) => setFilterClubId(val === "all" ? undefined : Number(val))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All Clubs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clubs</SelectItem>
                            {clubs?.map((club) => (
                                <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 min-w-[200px]">
                    <Label>País</Label>
                    <Select value={filterCountry} onValueChange={setFilterCountry}>
                        <SelectTrigger>
                            <SelectValue placeholder="Todos os Países" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_countries">Todos os Países</SelectItem>
                            {COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 min-w-[150px]">
                    <Label>Role/Function</Label>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger>
                            <SelectValue placeholder="Todas as Funções" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Funções</SelectItem>
                            <SelectItem value="user">Membro</SelectItem>
                            <SelectItem value="club_admin">Presidente</SelectItem>
                            <SelectItem value="club_officer">Membro Admin</SelectItem>
                            <SelectItem value="admin">Admin Geral</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end pb-0.5">
                    <Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button>
                </div>
            </div>

            {error && (
                <div className="p-4 mb-4 bg-red-500/10 border border-red-500/50 rounded-md text-red-500">
                    <p className="font-bold">Erro ao carregar usuários:</p>
                    <p>{error.message}</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Função / Cargo</TableHead>
                                <TableHead>Clube</TableHead>
                                <TableHead>País</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map((user) => {
                                const userClub = clubs?.find(c => c.id === user.motoClubId);
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{(user.roadName || user.name || 'Sem nome').toUpperCase()}</span>
                                                <span className="text-xs text-muted-foreground">{user.memberId || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getRoleBadge(user)}</TableCell>
                                        <TableCell>{userClub ? userClub.name : '-'}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                {getCountryFlagUrl(user.country) ? <img src={getCountryFlagUrl(user.country)!} alt={user.country || ''} className="w-5 h-auto rounded-sm" /> : '🌐'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.membershipStatus === 'approved' ? 'default' : 'outline'} className={user.membershipStatus === 'approved' ? 'bg-green-600' : ''}>
                                                {user.membershipStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleImpersonate(user.id)}>Login Como</Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleEditRoleClick(user)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveMember(user.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!users?.length && !error && (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Dialogs omitted for brevity in this debug version replace, assuming they are mostly same */}
            {addUserDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">Adicionar Membro</h2>
                            <Button variant="ghost" size="sm" onClick={() => setAddUserDialogOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-name">Nome Completo</Label>
                                <Input
                                    id="new-name"
                                    value={newUserData.name}
                                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-email">Email</Label>
                                <Input
                                    id="new-email"
                                    type="email"
                                    value={newUserData.email}
                                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-roadname">Road Name (Apelido)</Label>
                                <Input
                                    id="new-roadname"
                                    value={newUserData.roadName}
                                    onChange={(e) => setNewUserData({ ...newUserData, roadName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-club">Clube</Label>
                                    <Select
                                        value={newUserData.motoClubId ? String(newUserData.motoClubId) : ""}
                                        onValueChange={(val) => setNewUserData({ ...newUserData, motoClubId: Number(val) })}
                                    >
                                        <SelectTrigger id="new-club">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clubs?.map((club) => (
                                                <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="new-role">Função</Label>
                                    <Select
                                        value={newUserData.role}
                                        onValueChange={(val) => setNewUserData({ ...newUserData, role: val as any })}
                                    >
                                        <SelectTrigger id="new-role">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">Membro</SelectItem>
                                            <SelectItem value="club_officer">Membro Admin</SelectItem>
                                            <SelectItem value="club_admin">Presidente</SelectItem>
                                            <SelectItem value="admin">Admin Geral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-country">País</Label>
                                <Select
                                    value={newUserData.country}
                                    onValueChange={(val) => setNewUserData({ ...newUserData, country: val })}
                                >
                                    <SelectTrigger id="new-country">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COUNTRIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.name} ({c.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={createUserMutation.isPending} className="w-full">
                                    {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Criar Usuário
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Role Dialog */}
            {editRoleDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">Alterar Função</h2>
                            <Button variant="ghost" size="sm" onClick={() => setEditRoleDialogOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-md text-sm">
                                Usuário: <strong>{selectedUser?.name}</strong>
                            </div>

                            <div className="space-y-2">
                                <Label>Nova Função</Label>
                                <div className="grid gap-2">
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer" onClick={() => setSelectedRole('membro')}>
                                        <input type="radio" checked={selectedRole === 'membro'} onChange={() => setSelectedRole('membro')} />
                                        <span>Membro</span>
                                    </div>
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer" onClick={() => setSelectedRole('membro_cin')}>
                                        <input type="radio" checked={selectedRole === 'membro_cin'} onChange={() => setSelectedRole('membro_cin')} />
                                        <span>Membro C.I.N. (Inteligência)</span>
                                    </div>
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer" onClick={() => setSelectedRole('membro_admin')}>
                                        <input type="radio" checked={selectedRole === 'membro_admin'} onChange={() => setSelectedRole('membro_admin')} />
                                        <span>Membro Administrador (Oficial)</span>
                                    </div>
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer" onClick={() => setSelectedRole('presidente')}>
                                        <input type="radio" checked={selectedRole === 'presidente'} onChange={() => setSelectedRole('presidente')} />
                                        <span>Presidente (Club Admin)</span>
                                    </div>
                                    {currentUser?.role === 'admin' && (
                                        <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer border-red-500/30" onClick={() => setSelectedRole('admin_geral')}>
                                            <input type="radio" checked={selectedRole === 'admin_geral'} onChange={() => setSelectedRole('admin_geral')} />
                                            <span className="text-red-500 font-bold">Administrador Geral</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-2">
                                <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSaveRole} disabled={assignRoleMutation.isPending}>
                                    {assignRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
