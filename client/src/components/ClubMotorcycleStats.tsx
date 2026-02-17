
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike } from 'lucide-react';

const COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#0ea5e9', // sky-500
    '#14b8a6', // teal-500
    '#6366f1', // indigo-500
    '#22c55e', // green-500
];

export function ClubMotorcycleStats({ clubId }: { clubId: number }) {
    const { data: stats, isLoading } = trpc.motoClubs.getClubMotorcycleStats.useQuery({ clubId });

    if (isLoading) {
        return <Skeleton className="h-[300px] w-full rounded-xl" />;
    }

    if (!stats || stats.length === 0) {
        return null;
    }

    return (
        <Card className="h-full bg-slate-900/50 border-slate-800">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-200">
                    <Bike className="w-5 h-5 text-primary" />
                    Frota Do Clube
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="brand"
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {stats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number) => [`${value} motos`, 'Quantidade']}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
