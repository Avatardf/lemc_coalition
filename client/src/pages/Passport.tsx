import { useTranslation } from 'react-i18next';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useState, useCallback, useRef } from 'react';
import { Plus, Loader2, MapPin, Trash2, Calendar } from 'lucide-react';
import { getLoginUrl } from '@/const';
import { MapView } from '@/components/Map';

export default function Passport() {
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    locationName: '',
    latitude: '',
    longitude: '',
    address: '',
    notes: '',
  });
  const [mapReady, setMapReady] = useState(false);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  
  const { data: checkIns, isLoading } = trpc.passport.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const addCheckIn = trpc.passport.add.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      utils.passport.list.invalidate();
      setDialogOpen(false);
      setFormData({ locationName: '', latitude: '', longitude: '', address: '', notes: '' });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteCheckIn = trpc.passport.delete.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      utils.passport.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleMapReady = useCallback((mapInstance: google.maps.Map) => {
    mapRef.current = mapInstance;
    setMapReady(true);
    if (window.google?.maps) {
      setAutocompleteService(new window.google.maps.places.AutocompleteService());
    }
    updateMapMarkers(mapInstance);
  }, []);

  const handleLocationSearch = async (searchText: string) => {
    if (!autocompleteService || !searchText) return;

    autocompleteService.getPlacePredictions(
      { input: searchText },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          // You can display predictions here if needed
          console.log('Predictions:', predictions);
        }
      }
    );
  };

  const handlePlaceSelect = (placeId: string) => {
    if (!mapRef.current) return;

    const service = new google.maps.places.PlacesService(mapRef.current);
    service.getDetails({ placeId }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        setFormData({
          ...formData,
          locationName: place.name || '',
          latitude: lat.toString(),
          longitude: lng.toString(),
          address: place.formatted_address || '',
        });

        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(15);
        }
      }
    });
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString(),
    });

    // Reverse geocode to get location name
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setFormData(prev => ({
          ...prev,
          locationName: results[0].formatted_address || '',
          address: results[0].formatted_address || '',
        }));
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      toast.error('Please select a location on the map');
      return;
    }
    addCheckIn.mutate(formData);
  };

  // Update map markers when check-ins change
  const updateMapMarkers = useCallback((mapInstance: google.maps.Map) => {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    if (!checkIns) return;

    // Create new markers
    const newMarkers = checkIns.map(checkIn => {
      const marker = new google.maps.Marker({
        position: { 
          lat: parseFloat(checkIn.latitude), 
          lng: parseFloat(checkIn.longitude) 
        },
        map: mapInstance,
        title: checkIn.locationName,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${checkIn.locationName}</h3>
            <p style="font-size: 12px; color: #666;">${new Date(checkIn.checkInDate).toLocaleDateString()}</p>
            ${checkIn.notes ? `<p style="margin-top: 4px;">${checkIn.notes}</p>` : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance, marker);
      });

      return marker;
    });

    setMarkers(newMarkers);
  }, [checkIns, markers]);

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
            <CardDescription>{t('passport.title')}</CardDescription>
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

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">{t('passport.title')}</h1>
            <p className="text-muted-foreground">{t('passport.subtitle')}</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('passport.addCheckIn')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('passport.addCheckIn')}</DialogTitle>
                <DialogDescription>{t('passport.searchLocation')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  {/* Map for location selection */}
                  <div className="h-64 rounded-lg overflow-hidden border border-border">
                    <MapView
                      onMapReady={(mapInstance: google.maps.Map) => {
                        mapRef.current = mapInstance;
                        mapInstance.addListener('click', handleMapClick);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="locationName">{t('passport.location')}</Label>
                    <Input
                      id="locationName"
                      value={formData.locationName}
                      onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                      placeholder="Search or click on map"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        value={formData.latitude}
                        readOnly
                        placeholder="Click on map"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        value={formData.longitude}
                        readOnly
                        placeholder="Click on map"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">{t('passport.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add notes about this location..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={addCheckIn.isPending || !formData.latitude}>
                    {addCheckIn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('passport.save')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map View */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('passport.viewOnMap')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px]">
                <MapView
                  onMapReady={handleMapReady}
                />
              </div>
            </CardContent>
          </Card>

          {/* Check-ins List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t('passport.myCheckIns')}</CardTitle>
              <CardDescription>{checkIns?.length || 0} locations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {!checkIns || checkIns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('passport.noCheckIns')}</p>
                </div>
              ) : (
                checkIns.map((checkIn) => (
                  <div key={checkIn.id} className="p-3 border border-border rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{checkIn.locationName}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(checkIn.checkInDate).toLocaleDateString()}
                        </p>
                        {checkIn.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{checkIn.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete check-in at ${checkIn.locationName}?`)) {
                            deleteCheckIn.mutate({ id: checkIn.id });
                          }
                        }}
                        disabled={deleteCheckIn.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
