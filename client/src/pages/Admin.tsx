import { useTranslation } from 'react-i18next';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { Plus, Loader2, Check, X, Trash2, Shield } from 'lucide-react';
import { getLoginUrl } from '@/const';

export default function Admin() {
  const { t } = useTranslation();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [chapterForm, setChapterForm] = useState({
    name: '',
    location: '',
    foundingDate: '',
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'club_admin';
  const clubId = user?.motoClubId || 1; // Default to 1 for demo

  const { data: motoClub } = trpc.motoClubs.get.useQuery(
    { id: clubId },
    { enabled: isAuthenticated && isAdmin }
  );

  const { data: chapters } = trpc.motoClubs.getChapters.useQuery(
    { clubId },
    { enabled: isAuthenticated && isAdmin }
  );

  const { data: pendingRequests } = trpc.admin.pendingRequests.useQuery(
    { clubId },
    { enabled: isAuthenticated && isAdmin }
  );

  const approveRequest = trpc.admin.approveRequest.useMutation({
    onSuccess: () => {
      toast.success('Member approved successfully');
      utils.admin.pendingRequests.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectRequest = trpc.admin.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success('Request rejected');
      utils.admin.pendingRequests.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addChapter = trpc.motoClubs.addChapter.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      utils.motoClubs.getChapters.invalidate();
      setChapterDialogOpen(false);
      setChapterForm({ name: '', location: '', foundingDate: '' });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteChapter = trpc.motoClubs.deleteChapter.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      utils.motoClubs.getChapters.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    addChapter.mutate({
      motoClubId: clubId,
      name: chapterForm.name,
      location: chapterForm.location,
      foundingDate: chapterForm.foundingDate ? new Date(chapterForm.foundingDate) : undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('admin.title')}
            </CardTitle>
            <CardDescription>Admin access required</CardDescription>
          </CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <Button asChild className="w-full">
                <a href={getLoginUrl()}>{t('nav.login')}</a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                You do not have permission to access this page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary" />
            {t('admin.title')}
          </h1>
          <p className="text-muted-foreground">{motoClub?.name || 'Moto Club Management'}</p>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests">
              {t('admin.pendingRequests')}
              {pendingRequests && pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="club">{t('admin.clubInfo')}</TabsTrigger>
          </TabsList>

          {/* Pending Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.pendingRequests')}</CardTitle>
                <CardDescription>Review and approve member registration requests</CardDescription>
              </CardHeader>
              <CardContent>
                {!pendingRequests || pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t('admin.noPendingRequests')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 border border-border rounded-lg flex items-start justify-between gap-4"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">User ID: {request.userId}</h4>
                          {request.requestMessage && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {request.requestMessage}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Requested: {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveRequest.mutate({ requestId: request.id })}
                            disabled={approveRequest.isPending || rejectRequest.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t('admin.approveRequest')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectRequest.mutate({ requestId: request.id })}
                            disabled={approveRequest.isPending || rejectRequest.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t('admin.rejectRequest')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Club Info Tab */}
          <TabsContent value="club" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.clubInfo')}</CardTitle>
                <CardDescription>Manage your moto club information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t('admin.clubName')}</Label>
                    <p className="text-sm font-medium mt-1">{motoClub?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>{t('admin.foundingDate')}</Label>
                    <p className="text-sm font-medium mt-1">
                      {motoClub?.foundingDate
                        ? new Date(motoClub.foundingDate).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label>{t('admin.country')}</Label>
                    <p className="text-sm font-medium mt-1">{motoClub?.country || 'N/A'}</p>
                  </div>
                </div>
                {motoClub?.description && (
                  <div>
                    <Label>{t('admin.description')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{motoClub.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chapters Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('admin.chapters')}</CardTitle>
                    <CardDescription>Manage club chapters</CardDescription>
                  </div>
                  <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('admin.addChapter')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('admin.addChapter')}</DialogTitle>
                        <DialogDescription>Add a new chapter to your moto club</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddChapter}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="chapterName">{t('admin.chapterName')}</Label>
                            <Input
                              id="chapterName"
                              value={chapterForm.name}
                              onChange={(e) =>
                                setChapterForm({ ...chapterForm, name: e.target.value })
                              }
                              placeholder="Chapter Name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="chapterLocation">{t('admin.chapterLocation')}</Label>
                            <Input
                              id="chapterLocation"
                              value={chapterForm.location}
                              onChange={(e) =>
                                setChapterForm({ ...chapterForm, location: e.target.value })
                              }
                              placeholder="City, State"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="chapterFoundingDate">
                              {t('admin.chapterFoundingDate')}
                            </Label>
                            <Input
                              id="chapterFoundingDate"
                              type="date"
                              value={chapterForm.foundingDate}
                              onChange={(e) =>
                                setChapterForm({ ...chapterForm, foundingDate: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={addChapter.isPending}>
                            {addChapter.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {t('admin.addChapter')}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!chapters || chapters.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No chapters yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className="p-3 border border-border rounded-lg flex items-start justify-between"
                      >
                        <div>
                          <h4 className="font-medium">{chapter.name}</h4>
                          {chapter.location && (
                            <p className="text-sm text-muted-foreground">{chapter.location}</p>
                          )}
                          {chapter.foundingDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Founded: {new Date(chapter.foundingDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete chapter "${chapter.name}"?`)) {
                              deleteChapter.mutate({ id: chapter.id });
                            }
                          }}
                          disabled={deleteChapter.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
