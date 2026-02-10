import { useTranslation } from 'react-i18next';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { getLoginUrl } from '@/const';
import { ImageCropDialog } from '@/components/ImageCropDialog';

export default function Profile() {
  const { t } = useTranslation();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    roadName: user?.roadName || '',
    documentNumber: user?.documentNumber || '',
    motoClubId: user?.motoClubId || undefined,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
  const { data: motoClubs } = trpc.motoClubs.list.useQuery();
  
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const uploadPhoto = trpc.profile.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success(t('profile.uploadPhoto') + ' - ' + t('common.success'));
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadPhoto.mutate({
        fileData: base64,
        fileName: 'profile-photo.jpg',
        mimeType: 'image/jpeg',
      });
    };
    reader.readAsDataURL(croppedBlob);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('nav.login')}</CardTitle>
            <CardDescription>{t('profile.title')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>{t('nav.login')}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const membershipStatusColors = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    approved: 'text-green-600 bg-green-50 border-green-200',
    rejected: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t('profile.title')}</h1>
          <p className="text-muted-foreground">{t('profile.edit')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Photo Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">{t('profile.photo')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={user?.profilePhotoUrl || ''} alt={user?.fullName || user?.name || ''} />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {(user?.fullName || user?.name || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPhoto.isPending}
                className="w-full"
              >
                {uploadPhoto.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {t('profile.uploadPhoto')}
              </Button>

              {/* Membership Status */}
              {user?.membershipStatus && (
                <div className={`w-full px-3 py-2 rounded-md border text-sm font-medium text-center ${membershipStatusColors[user.membershipStatus]}`}>
                  {t(`profile.${user.membershipStatus}`)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Form Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('profile.edit')}</CardTitle>
              <CardDescription>Update your member information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('profile.fullName')}</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roadName">{t('profile.roadName')}</Label>
                  <Input
                    id="roadName"
                    value={formData.roadName}
                    onChange={(e) => setFormData({ ...formData, roadName: e.target.value })}
                    placeholder="Rider"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentNumber">{t('profile.documentNumber')}</Label>
                  <Input
                    id="documentNumber"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motoClub">{t('profile.motoClub')}</Label>
                  <Select
                    value={formData.motoClubId?.toString()}
                    onValueChange={(value) => setFormData({ ...formData, motoClubId: parseInt(value) })}
                  >
                    <SelectTrigger id="motoClub">
                      <SelectValue placeholder="Select your moto club" />
                    </SelectTrigger>
                    <SelectContent>
                      {motoClubs?.map((club) => (
                        <SelectItem key={club.id} value={club.id.toString()}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('profile.save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        imageUrl={selectedImage}
        onClose={() => setCropDialogOpen(false)}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        cropShape="round"
      />
    </div>
  );
}
