import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Check, X, ShieldAlert, Plus, Upload, Pencil, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from "wouter";
import { UsersList } from "@/components/UsersList";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { COUNTRIES, getCountryFlagUrl } from '@shared/countries';

export default function AdminDashboard() {
    const { t } = useTranslation();
    const { user, isAuthenticated, loading } = useAuth();
    const [location, setLocation] = useLocation();
    const utils = trpc.useUtils();

    // Requests State
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);

    // Club Management State
    const [createClubDialogOpen, setCreateClubDialogOpen] = useState(false);
    const [newClubName, setNewClubName] = useState('');
    const [newClubDescription, setNewClubDescription] = useState('');
    const [newClubCountry, setNewClubCountry] = useState('BR');
    const [newClubPresidentEmail, setNewClubPresidentEmail] = useState('');
    const [newClubLogo, setNewClubLogo] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit Club State
    const [editClubDialogOpen, setEditClubDialogOpen] = useState(false);
    const [clubToEdit, setClubToEdit] = useState<any>(null);
    const [editClubName, setEditClubName] = useState('');
    const [editClubDescription, setEditClubDescription] = useState('');
    const [editClubCountry, setEditClubCountry] = useState('');
    const [editClubLogo, setEditClubLogo] = useState<string | null>(null);

    // Delete Club State
    const [deleteClubDialogOpen, setDeleteClubDialogOpen] = useState(false);
    const [clubToDelete, setClubToDelete] = useState<any>(null);
    const [deleteConfirmationStep, setDeleteConfirmationStep] = useState(1);

    // Redirect if not authenticated
    if (!loading && !isAuthenticated) {
        setLocation('/');
        return null;
    }

    // Check if user is an admin or club admin
    const isAuthorized = user?.role === 'admin' || user?.role === 'club_admin';
    const isSuperAdmin = user?.role === 'admin';

    // Determine which club ID to use
    const userClubId = user?.motoClubId;

    // Queries
    const { data: pendingRequests, isLoading: requestsLoading } = trpc.admin.pendingRequests.useQuery(
        { clubId: userClubId || 0 },
        { enabled: !!userClubId && !isSuperAdmin && isAuthorized }
    );

    const { data: allClubs, isLoading: clubsLoading } = trpc.motoClubs.list.useQuery(
        undefined,
        { enabled: isSuperAdmin && isAuthorized }
    );

    const { data: deletedClubs, isLoading: deletedClubsLoading } = trpc.motoClubs.listDeleted.useQuery(
        undefined,
        { enabled: isSuperAdmin && isAuthorized }
    );

    const { data: pingResult, error: pingError } = trpc.admin.pingAdmin.useQuery(undefined, {
        retry: false,
    });

    if (pingResult) {
        console.log("[Admin] Server Connectivity Verified:", pingResult);
    }
    if (pingError) {
        console.error("[Admin] Server Connectivity Failed:", pingError.message);
    }

    // Mutations
    const deleteClubMutation = trpc.motoClubs.delete.useMutation({
        onSuccess: () => {
            toast.success("Club deleted successfully");
            setDeleteClubDialogOpen(false);
            setDeleteConfirmationStep(1);
            setClubToDelete(null);
            utils.motoClubs.list.invalidate();
            utils.motoClubs.listDeleted.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const updateClubMutation = trpc.motoClubs.update.useMutation({
        onSuccess: () => {
            toast.success("Club updated successfully");
            setEditClubDialogOpen(false);
            setClubToEdit(null);
            utils.motoClubs.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const approveMutation = trpc.admin.approveRequest.useMutation({
        onSuccess: () => {
            toast.success("Request approved successfully");
            setApproveDialogOpen(false);
            setSelectedRequest(null);
            setReviewNotes('');
            utils.admin.pendingRequests.invalidate();
        },
        onError: (error) => toast.error(error.message)
    });

    const rejectMutation = trpc.admin.rejectRequest.useMutation({
        onSuccess: () => {
            toast.success("Request rejected");
            setRejectDialogOpen(false);
            setSelectedRequest(null);
            setReviewNotes('');
            utils.admin.pendingRequests.invalidate();
        },
        onError: (error) => toast.error(error.message)
    });

    const createClubMutation = trpc.motoClubs.create.useMutation({
        onSuccess: () => {
            toast.success("Moto Club created successfully");
            setCreateClubDialogOpen(false);
            setNewClubName('');
            setNewClubDescription('');
            setNewClubPresidentEmail('');
            setNewClubLogo(null);
            utils.motoClubs.list.invalidate();
        },
        onError: (error) => toast.error(error.message)
    });

    if (!loading && !isAuthorized) {
        return (
            <div className="container py-16 flex flex-col items-center text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
                <Button className="mt-6" onClick={() => setLocation('/')}>Return Home</Button>
            </div>
        );
    }

    // Existing Handlers
    const handleApproveClick = (request: any) => {
        setSelectedRequest(request);
        setApproveDialogOpen(true);
    };

    const handleRejectClick = (request: any) => {
        setSelectedRequest(request);
        setRejectDialogOpen(true);
    };

    const confirmApprove = () => {
        if (!selectedRequest) return;
        approveMutation.mutate({
            requestId: selectedRequest.id,
            reviewNotes: reviewNotes || undefined
        });
    };

    const confirmReject = () => {
        if (!selectedRequest) return;
        rejectMutation.mutate({
            requestId: selectedRequest.id,
            reviewNotes: reviewNotes || undefined
        });
    };

    // Club Management Handlers
    const openEditClubDialog = (club: any) => {
        setClubToEdit(club);
        setEditClubName(club.name);
        setEditClubDescription(club.description || '');
        setEditClubCountry(club.country || '');
        setEditClubLogo(club.logoUrl);
        setEditClubDialogOpen(true);
    };

    const openDeleteClubDialog = (club: any) => {
        setClubToDelete(club);
        setDeleteConfirmationStep(1);
        setDeleteClubDialogOpen(true);
    };

    const handleDeleteClubStep1 = () => {
        setDeleteConfirmationStep(2);
    };

    const handleDeleteClubStep2 = () => {
        if (clubToDelete) {
            deleteClubMutation.mutate({ id: clubToDelete.id });
        }
    };

    const handleUpdateClub = () => {
        if (clubToEdit) {
            updateClubMutation.mutate({
                id: clubToEdit.id,
                name: editClubName,
                description: editClubDescription,
                country: editClubCountry,
                logoUrl: editClubLogo || undefined
            });
        }
    };

    // Image Cropping State
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [cropTarget, setCropTarget] = useState<'create' | 'edit'>('create');

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'edit') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
                setCropTarget(target);
                setCropDialogOpen(true);
                // Reset input value so the same file can be selected again if needed
                e.target.value = '';
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (cropTarget === 'create') {
                setNewClubLogo(reader.result as string);
                console.log("Creation Logo Updated:", (reader.result as string).substring(0, 50));
            } else {
                setEditClubLogo(reader.result as string);
                console.log("Edit Logo Updated:", (reader.result as string).substring(0, 50));
            }
            setCropDialogOpen(false);
            setImageToCrop(null);
        };
        reader.readAsDataURL(croppedBlob);
    };

    const handleCreateClub = () => {
        createClubMutation.mutate({
            name: newClubName,
            description: newClubDescription,
            country: newClubCountry,
            presidentEmail: newClubPresidentEmail || undefined,
            logoUrl: newClubLogo || undefined
        });
    };

    return (
        <div className="min-h-screen bg-muted/30 py-8 pt-12">
            <div className="container max-w-6xl">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                            {isSuperAdmin ? 'Coalition Administration' : 'Club Administration'}
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20 py-0 px-2 h-5">
                                v1.0.4 - SOCIAL UPDATE
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground">Manage your organization</p>
                    </div>
                    {isSuperAdmin && (
                        <Button
                            onClick={() => setCreateClubDialogOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/20 px-6"
                        >
                            <Plus className="h-4 w-4 mr-2" /> NOVO MOTO CLUBE
                        </Button>
                    )}
                </div>

                {/* Super Admin: Club Management */}
                {isSuperAdmin && (
                    <div className="grid gap-6 mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Moto Clubs</CardTitle>
                                <CardDescription>All registered clubs in the coalition</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {clubsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Logo</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Country</TableHead>
                                                    <TableHead>Members</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(allClubs || []).map((club) => (
                                                    <TableRow key={club.id}>
                                                        <TableCell>
                                                            {club.logoUrl ? (
                                                                <img src={club.logoUrl} alt={club.name} className="h-8 w-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">
                                                                    {club.name.substring(0, 2)}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium">{club.name}</TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex justify-center" title={club.country}>
                                                                {getCountryFlagUrl(club.country) ? (
                                                                    <img
                                                                        src={getCountryFlagUrl(club.country)!}
                                                                        alt={club.country || ''}
                                                                        className="w-5 h-auto rounded-sm shadow-sm"
                                                                    />
                                                                ) : (
                                                                    <span className="text-muted-foreground opacity-50">🌐</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground italic">View details</TableCell>
                                                        <TableCell className="text-right flex items-center justify-end gap-2">
                                                            <Button variant="ghost" size="sm" onClick={() => setLocation(`/club/${club.id}`)}>
                                                                Profile
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => openEditClubDialog(club)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteClubDialog(club)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {(!allClubs || allClubs.length === 0) && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                            No clubs found. Create one to get started.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* User Management */}
                        <Card>
                            <CardHeader>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>Manage system users and impersonate if needed</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UsersList />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Club Admin: Requests Management (Only show if user belongs to a club) */}
                {userClubId ? (
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Membership Requests</CardTitle>
                                <CardDescription>Review new requests to join your club</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {requestsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : !pendingRequests || pendingRequests.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No pending requests at this time.
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>User ID</TableHead>
                                                    <TableHead>Message</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pendingRequests.map((request) => (
                                                    <TableRow key={request.id}>
                                                        <TableCell>
                                                            {new Date(request.createdAt).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {request.userId}
                                                        </TableCell>
                                                        <TableCell className="max-w-[300px] truncate">
                                                            {request.requestMessage || <span className="text-muted-foreground italic">No message</span>}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => handleApproveClick(request)}
                                                            >
                                                                <Check className="h-4 w-4 mr-1" /> Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleRejectClick(request)}
                                                            >
                                                                <X className="h-4 w-4 mr-1" /> Reject
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : !isSuperAdmin ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            You are an administrator but not assigned to a specific Moto Club.
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            {/* Create Club Dialog */}
            <Dialog open={createClubDialogOpen} onOpenChange={setCreateClubDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Moto Club</DialogTitle>
                        <DialogDescription>
                            Add a new motorcycle club to the coalition.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex flex-col items-center justify-center gap-4 mb-4">
                            <div
                                className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:bg-muted/80 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {newClubLogo ? (
                                    <img src={newClubLogo} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                        <Upload className="h-6 w-6 mb-1" />
                                        <span className="text-xs">Logo</span>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleLogoUpload(e, 'create')}
                            />
                            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                                Upload Coat/Logo
                            </Button>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="club-name">Club Name</Label>
                            <Input id="club-name" value={newClubName} onChange={(e) => setNewClubName(e.target.value)} placeholder="e.g. Iron Horse MC" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="club-country">País</Label>
                            <Select value={newClubCountry} onValueChange={setNewClubCountry}>
                                <SelectTrigger id="club-country">
                                    <SelectValue placeholder="Select Country" />
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
                        <div className="grid gap-2">
                            <Label htmlFor="president-email">President Email</Label>
                            <Input id="president-email" type="email" value={newClubPresidentEmail} onChange={(e) => setNewClubPresidentEmail(e.target.value)} placeholder="president@example.com" />
                            <p className="text-xs text-muted-foreground">If the user exists, they will be auto-assigned as Club Admin.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="club-desc">Description</Label>
                            <Textarea id="club-desc" value={newClubDescription} onChange={(e) => setNewClubDescription(e.target.value)} placeholder="Brief description of the club..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateClubDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateClub} disabled={createClubMutation.isPending || !newClubName}>
                            {createClubMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Club
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Membership Request</DialogTitle>
                        <DialogDescription>
                            This will add the user to the club and generate their Member ID.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="approve-notes">Optional Notes</Label>
                            <Textarea
                                id="approve-notes"
                                placeholder="Welcome to the club!"
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={confirmApprove} disabled={approveMutation.isPending}>
                            {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirm Approval
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Membership Request</DialogTitle>
                        <DialogDescription>
                            The user will be notified that their request was declined.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reject-notes">Reason for Rejection</Label>
                            <Textarea
                                id="reject-notes"
                                placeholder="Please provide a reason..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmReject} disabled={rejectMutation.isPending}>
                            {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Reject Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Club Dialog */}
            <Dialog open={editClubDialogOpen} onOpenChange={setEditClubDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Moto Club</DialogTitle>
                        <DialogDescription>
                            Update club details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex flex-col items-center justify-center gap-4 mb-4">
                            <div
                                className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:bg-muted/80 transition-colors"
                                onClick={() => document.getElementById('edit-club-logo-upload')?.click()}
                            >
                                {editClubLogo ? (
                                    <img src={editClubLogo} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                        <Upload className="h-6 w-6 mb-1" />
                                        <span className="text-xs">Logo</span>
                                    </div>
                                )}
                            </div>
                            <input
                                id="edit-club-logo-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleLogoUpload(e, 'edit')}
                            />
                            <Button variant="ghost" size="sm" onClick={() => document.getElementById('edit-club-logo-upload')?.click()}>
                                Change Logo
                            </Button>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-club-name">Club Name</Label>
                            <Input id="edit-club-name" value={editClubName} onChange={(e) => setEditClubName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-club-country">País</Label>
                            <Select value={editClubCountry} onValueChange={setEditClubCountry}>
                                <SelectTrigger id="edit-club-country">
                                    <SelectValue placeholder="Select Country" />
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
                        <div className="grid gap-2">
                            <Label htmlFor="edit-club-desc">Description</Label>
                            <Textarea id="edit-club-desc" value={editClubDescription} onChange={(e) => setEditClubDescription(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditClubDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateClub} disabled={updateClubMutation.isPending}>
                            {updateClubMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Update Club
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Club Dialog - 2 Steps */}
            <Dialog open={deleteClubDialogOpen} onOpenChange={setDeleteClubDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5" />
                            {deleteConfirmationStep === 1 ? 'Delete Club Warning' : 'Final Confirmation'}
                        </DialogTitle>
                        <DialogDescription>
                            {deleteConfirmationStep === 1
                                ? "You are about to delete a Moto Club. This action will have significant impact."
                                : "This is your last chance to cancel."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {deleteConfirmationStep === 1 ? (
                            <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
                                Warning: Deleting <strong>{clubToDelete?.name}</strong> will remove the club from the active list.
                                All members associated with this club will also be soft-deleted.
                                This data will be archived.
                            </div>
                        ) : (
                            <div className="p-4 bg-red-100 text-red-900 rounded-md text-sm border-2 border-red-500 font-bold">
                                ARE YOU ABSOLUTELY SURE?
                                <br /><br />
                                Review: Deleting {clubToDelete?.name} + ALL Members.
                            </div>
                        )}
                        <div className="mt-4 flex gap-2">
                            {deleteConfirmationStep === 1 ? (
                                <Button variant="secondary" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors" onClick={() => setDeleteConfirmationStep(2)}>
                                    I understand the consequences, continue
                                </Button>
                            ) : (
                                <div className="w-full flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setDeleteClubDialogOpen(false)}>Cancel</Button>
                                    <Button variant="destructive" className="flex-1" onClick={handleDeleteClubStep2} disabled={deleteClubMutation.isPending}>
                                        {deleteClubMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Permanently Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    {deleteConfirmationStep === 1 && (
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteClubDialogOpen(false)}>Cancel</Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Deleted Clubs List (Super Admin) - At the bottom */}
            {isSuperAdmin && deletedClubs && deletedClubs.length > 0 && (
                <div className="mt-16 container max-w-6xl pb-8">
                    <h3 className="text-xl font-bold text-muted-foreground mb-4">Archived / Deleted Clubs</h3>
                    <div className="rounded-md border bg-muted/20">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Logo</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Deleted At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deletedClubs.map((club) => (
                                    <TableRow key={club.id} className="opacity-70">
                                        <TableCell>
                                            {club.logoUrl ? (
                                                <img src={club.logoUrl} alt={club.name} className="h-8 w-8 rounded-full grayscale" />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs grayscale">
                                                    {(club.name || '').substring(0, 2)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{club.name}</TableCell>
                                        <TableCell>
                                            {club.deletedAt ? new Date(club.deletedAt).toLocaleDateString() : 'Unknown'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
            {/* Crop Dialog */}
            <ImageCropDialog
                open={cropDialogOpen}
                onClose={() => setCropDialogOpen(false)}
                imageUrl={imageToCrop || ''}
                onCropComplete={handleCropComplete}
                aspectRatio={1} // 1:1 for logos
            />
        </div>
    );
}
