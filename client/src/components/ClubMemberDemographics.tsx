import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { differenceInYears, parseISO } from 'date-fns';
import { COUNTRIES } from '@shared/countries';

interface ClubMemberDemographicsProps {
    members: any[];
}

const BLUE_GREEN_COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#0ea5e9', // sky-500
    '#14b8a6', // teal-500
    '#6366f1', // indigo-500
    '#22c55e', // green-500
];

export function ClubMemberAgeChart({ members }: ClubMemberDemographicsProps) {
    const data = useMemo(() => {
        const ranges = [
            { name: '20 a 30', min: 20, max: 30, count: 0 },
            { name: '31 a 40', min: 31, max: 40, count: 0 },
            { name: '41 a 50', min: 41, max: 50, count: 0 },
            { name: '51 a 60', min: 51, max: 60, count: 0 },
            { name: '61 a 70', min: 61, max: 70, count: 0 },
            { name: 'Mais de 70', min: 71, max: Infinity, count: 0 },
        ];

        let hasData = false;

        members.forEach(member => {
            if (member.birthDate) {
                const dateObj = typeof member.birthDate === 'string' ? parseISO(member.birthDate) : new Date(member.birthDate);
                if (!isNaN(dateObj.getTime())) {
                    const age = differenceInYears(new Date(), dateObj);
                    const range = ranges.find(r => age >= r.min && age <= r.max);
                    if (range) {
                        range.count++;
                        hasData = true;
                    }
                }
            }
        });

        if (!hasData) return [];

        return ranges.filter(r => r.count > 0);
    }, [members]);

    if (data.length === 0) return null;

    return (
        <Card className="h-full bg-slate-900/50 border-slate-800">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold text-slate-200">
                    Distribuição Por Faixa Etária
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={5}
                                dataKey="count"
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={BLUE_GREEN_COLORS[index % BLUE_GREEN_COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function ClubMemberYearChart({ members }: ClubMemberDemographicsProps) {
    const data = useMemo(() => {
        const yearCounts: Record<string, number> = {};
        let hasData = false;

        members.forEach(member => {
            if (member.birthDate) {
                const dateObj = typeof member.birthDate === 'string' ? parseISO(member.birthDate) : new Date(member.birthDate);
                if (!isNaN(dateObj.getTime())) {
                    const year = dateObj.getFullYear();
                    const label = `${year}`;
                    yearCounts[label] = (yearCounts[label] || 0) + 1;
                    hasData = true;
                }
            }
        });

        if (!hasData) return [];

        return Object.entries(yearCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => parseInt(a.name) - parseInt(b.name));
    }, [members]);

    if (data.length === 0) return null;

    return (
        <Card className="h-full bg-slate-900/50 border-slate-800">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold text-slate-200">Ano De Nascimento</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={5}
                                dataKey="count"
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={BLUE_GREEN_COLORS[index % BLUE_GREEN_COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function ClubMemberCountryChart({ members }: ClubMemberDemographicsProps) {
    const data = useMemo(() => {
        const counts: Record<string, number> = {};
        let hasData = false;

        members.forEach(member => {
            if (member.country) {
                const countryData = COUNTRIES.find(c => c.code === member.country);
                const label = countryData ? countryData.name : member.country;
                counts[label] = (counts[label] || 0) + 1;
                hasData = true;
            }
        });

        if (!hasData) return [];

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [members]);

    if (data.length === 0) return null;

    return (
        <Card className="h-full bg-slate-900/50 border-slate-800">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold text-slate-200">
                    Países De Origem
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="h-[250px] w-full mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={5}
                                dataKey="count"
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={BLUE_GREEN_COLORS[index % BLUE_GREEN_COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-2 justify-center mt-2 h-[36px] overflow-hidden">
                    {data.map((item, index) => {
                        const countryCode = COUNTRIES.find(c => c.name === item.name)?.code;
                        const flagUrl = countryCode ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` : null;
                        return (
                            <div key={item.name} className="flex items-center gap-1 bg-muted/20 px-2 py-0.5 rounded border border-border/50">
                                {flagUrl && <img src={flagUrl} alt={item.name} className="w-4 h-auto rounded-sm" />}
                                <span className="text-[10px] font-bold text-slate-400">{countryCode}</span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
