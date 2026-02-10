import { useTranslation } from 'react-i18next';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { Plus, Loader2, Trash2, Upload, Bike } from 'lucide-react';
import { getLoginUrl } from '@/const';
import { ImageCropDialog } from '@/components/ImageCropDialog';

export default function Garage() {
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    licensePlate: '',
    brand: '',
    model: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<number | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [currentMotorcycleId, setCurrentMotorcycleId] = useState<number | null>(null);
  
  const { data: motorcycles, isLoading } = trpc.garage.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const addMotorcycle = trpc.garage.add.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      utils.garage.list.invalidate();
      setDialogOpen(false);
      setFormData({ licensePlate: '', brand: '', model: '' });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMotorcycle = trpc.garage.delete.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      utils.garage.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const uploadPhoto = trpc.garage.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success(t('garage.uploadPhoto') + ' - ' + t('common.success'));
      utils.garage.list.invalidate();
      setUploadingPhotoFor(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setUploadingPhotoFor(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMotorcycle.mutate(formData);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, motorcycleId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setCurrentMotorcycleId(motorcycleId);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!currentMotorcycleId) return;
    
    setUploadingPhotoFor(currentMotorcycleId);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadPhoto.mutate({
        motorcycleId: currentMotorcycleId,
        fileData: base64,
        fileName: 'motorcycle-photo.jpg',
        mimeType: 'image/jpeg',
      });
    };
    reader.readAsDataURL(croppedBlob);
  };

  if (loading || isLoading) {
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
            <CardDescription>{t('garage.title')}</CardDescription>
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

  const canAddMore = (motorcycles?.length || 0) < 2;

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">{t('garage.title')}</h1>
            <p className="text-muted-foreground">
              {motorcycles?.length || 0} / 2 {t('garage.title').toLowerCase()}
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canAddMore}>
                <Plus className="h-4 w-4 mr-2" />
                {t('garage.addMotorcycle')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('garage.addMotorcycle')}</DialogTitle>
                <DialogDescription>
                  {canAddMore ? 'Add your motorcycle details' : t('garage.maxReached')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">{t('garage.licensePlate')}</Label>
                    <Input
                      id="licensePlate"
                      value={formData.licensePlate}
                      onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                      placeholder="ABC-1234"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">{t('garage.brand')}</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Harley-Davidson"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">{t('garage.model')}</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Street Glide"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={addMotorcycle.isPending}>
                    {addMotorcycle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('garage.save')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!motorcycles || motorcycles.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Bike className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground mb-4">{t('garage.noMotorcycles')}</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('garage.addMotorcycle')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {motorcycles.map((motorcycle) => (
              <Card key={motorcycle.id} className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {motorcycle.photoUrl ? (
                    <img 
                      src={motorcycle.photoUrl} 
                      alt={`${motorcycle.brand} ${motorcycle.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Bike className="h-20 w-20 text-muted-foreground" />
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, motorcycle.id)}
                  />
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhotoFor === motorcycle.id}
                  >
                    {uploadingPhotoFor === motorcycle.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <CardHeader>
                  <CardTitle>{motorcycle.brand} {motorcycle.model}</CardTitle>
                  <CardDescription>{motorcycle.licensePlate}</CardDescription>
                </CardHeader>
                
                <CardFooter>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete ${motorcycle.brand} ${motorcycle.model}?`)) {
                        deleteMotorcycle.mutate({ id: motorcycle.id });
                      }
                    }}
                    disabled={deleteMotorcycle.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('garage.delete')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        imageUrl={selectedImage}
        onClose={() => setCropDialogOpen(false)}
        onCropComplete={handleCropComplete}
        aspectRatio={16 / 9}
        cropShape="rect"
      />
    </div>
  );
}
