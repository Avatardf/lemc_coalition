import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCountryFlagUrl, COUNTRIES } from '@shared/countries';
import { Badge } from '@/components/ui/badge';

interface ClubPresenceProps {
    members: any[];
}

export function ClubPresence({ members }: ClubPresenceProps) {
    const countries = useMemo(() => {
        const uniqueCountries = new Set<string>();

        members.forEach(member => {
            if (member.country) {
                uniqueCountries.add(member.country);
            }
        });

        // Convert to array and sort
        return Array.from(uniqueCountries)
            .map(code => {
                const countryData = COUNTRIES.find(c => c.code === code);
                return {
                    code,
                    name: countryData ? countryData.name : code,
                    flagUrl: getCountryFlagUrl(code)
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [members]);

    if (countries.length === 0) {
        return null;
    }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Presença Global</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                    {countries.map((country) => (
                        <div key={country.code} className="flex flex-col items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border min-w-[80px]">
                            {country.flagUrl ? (
                                <img
                                    src={country.flagUrl}
                                    alt={country.name}
                                    className="w-12 h-auto rounded-md shadow-sm object-cover"
                                />
                            ) : (
                                <div className="w-12 h-8 bg-muted rounded-md flex items-center justify-center text-xs">
                                    ?
                                </div>
                            )}
                            <Badge variant="outline" className="text-xs font-mono font-bold uppercase tracking-wider bg-background">
                                {country.code}
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
