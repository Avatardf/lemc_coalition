import { Link, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageCircle, Award } from 'lucide-react';
import { getCountryFlagUrl } from '@shared/countries';
import { ClubMotorcycleStats } from '@/components/ClubMotorcycleStats';
import { ClubMemberAgeChart, ClubMemberYearChart, ClubMemberCountryChart } from '@/components/ClubMemberDemographics';
import { ClubPresence } from '@/components/ClubPresence';

export default function ClubProfile() {
    const [match, params] = useRoute('/club/:id');
    const clubId = match && params ? parseInt(params.id) : 0;
    const { t } = useTranslation();

    const { data: club, isLoading: clubLoading } = trpc.motoClubs.get.useQuery(
        { id: clubId },
        { enabled: !!clubId }
    );

    const { data: members, isLoading: membersLoading } = trpc.motoClubs.getMembers.useQuery(
        { clubId },
        { enabled: !!clubId }
    );

    if (!match) return <div>Invalid Route</div>;

    if (clubLoading || membersLoading) {
        return (
            <div className="container py-8 flex flex-col items-center space-y-4">
                <Skeleton className="h-48 w-48 rounded-full" />
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-64 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (!club) {
        return (
            <div className="container py-16 text-center">
                <h1 className="text-2xl font-bold">Club not found</h1>
            </div>
        );
    }

    const president = members?.find(m => m.id === club.presidentId);
    const otherMembers = members?.filter(m => m.id !== club.presidentId) || [];

    return (
        <div className="min-h-screen bg-muted/30 pb-12">
            {/* Hero Section */}
            <div className="bg-background border-b relative">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <div className="container py-12 flex flex-col items-center text-center relative z-10">
                    <Avatar className="h-48 w-48 mb-6 border-4 border-primary/20 shadow-xl">
                        <AvatarImage src={club.logoUrl || ''} alt={club.name} />
                        <AvatarFallback className="text-4xl bg-muted">{club.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <h1 className="text-4xl font-bold text-foreground mb-2">{club.name}</h1>

                    <div className="flex gap-2 mb-4">
                        <Link href={`/club/${club.id}/certificate`}>
                            <Button variant="outline" size="sm" className="gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400">
                                <Award className="w-4 h-4" />
                                Certificado de Membro
                            </Button>
                        </Link>
                    </div>
                    <div className="mb-4" title={club.country ?? undefined}>
                        {getCountryFlagUrl(club.country ?? undefined) ? (
                            <img src={getCountryFlagUrl(club.country ?? undefined)!} alt={club.country ?? ''} className="w-8 h-auto rounded-sm shadow-md mx-auto" />
                        ) : (
                            <span className="text-xl text-muted-foreground font-medium">{club.country}</span>
                        )}
                    </div>
                    {club.description && (
                        <p className="max-w-2xl text-muted-foreground italic">&ldquo;{club.description}&rdquo;</p>
                    )}
                </div>
            </div>

            <div className="container py-12">
                {/* President Section */}
                {president && (
                    <div className="mb-12">
                        <div className="flex items-center justify-center mb-8 relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-muted/30 px-2 text-muted-foreground font-bold text-lg">Club President</span>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <MemberCard member={president} isPresident />
                        </div>
                    </div>
                )}

                {/* Statistics Section */}
                <div className="mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ClubMotorcycleStats clubId={club.id} />
                        <ClubMemberAgeChart members={members || []} />
                        <ClubMemberYearChart members={members || []} />
                        <ClubMemberCountryChart members={members || []} />
                    </div>
                </div>

                {/* Members Grid */}
                <div>
                    <div className="flex items-center justify-center mb-8 relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-muted/30 px-2 text-muted-foreground font-bold text-lg">Members</span>
                        </div>
                    </div>

                    {otherMembers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {otherMembers.map((member) => (
                                <MemberCard key={member.id} member={member} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No other members listed.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function MemberCard({ member, isPresident = false }: { member: any, isPresident?: boolean }) {
    return (
        <Card className={`overflow-hidden transition-all hover:shadow-md ${isPresident ? 'border-primary/50 bg-gradient-to-b from-primary/10 to-background transform hover:-translate-y-1' : 'bg-card'}`}>
            <CardContent className="p-6 flex flex-col items-center text-center">
                <Avatar className={`mb-4 ${isPresident ? 'h-32 w-32 border-4 border-primary ring-4 ring-primary/20' : 'h-24 w-24'}`}>
                    <AvatarImage src={member.profilePhotoUrl || ''} alt={member.roadName || member.name || ''} />
                    <AvatarFallback className="text-lg bg-muted text-muted-foreground">
                        {member.roadName ? member.roadName[0].toUpperCase() : (member.name ? member.name[0].toUpperCase() : 'M')}
                    </AvatarFallback>
                </Avatar>

                <h3 className={`font-bold truncate w-full mb-1 ${isPresident ? 'text-2xl text-primary' : 'text-xl'}`}>
                    {member.roadName || member.name}
                </h3>

                {isPresident && <p className="text-sm font-semibold text-primary/80 mb-2 uppercase tracking-wider">President</p>}

                {member.memberId && (
                    <div className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground mb-4">
                        {member.memberId}
                    </div>
                )}

                {member.phoneNumber ? (
                    <Button
                        className="w-full mt-auto gap-2"
                        variant={isPresident ? "default" : "outline"}
                        asChild
                    >
                        <a
                            href={`https://wa.me/${member.phoneNumber.replace(/\D/g, '')}?text=Hello%20from%20LEMC%20Coalition`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                        </a>
                    </Button>
                ) : (
                    <div className="h-10 mt-auto w-full flex items-center justify-center text-xs text-muted-foreground italic">
                        Contact private
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
