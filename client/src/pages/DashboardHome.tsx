import React from 'react';
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SocialFeed } from "./Social/Feed";
import { Link } from "wouter";
import { getCountryFlagUrl } from '@shared/countries';
import { Button } from "@/components/ui/button";
import { Shield, User, Bike, Map, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardHome() {
    const { user } = useAuth();
    // Fetch full user details to get emblem, ID, etc.
    const { data: fullUser } = trpc.auth.me.useQuery(undefined, { enabled: !!user });

    // Fetch My Club for the emblem if needed, though fullUser might have it if joined
    const { data: myClub } = trpc.motoClubs.get.useQuery(
        { id: user?.motoClubId || 0 },
        { enabled: !!user?.motoClubId }
    );

    if (!user) return null;

    return (
        <div className="flex flex-col min-h-screen bg-slate-950">
            {/* Background Texture similar to original */}
            <div
                className="fixed inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'url(/road-background.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'grayscale(100%) contrast(120%)'
                }}
            />

            <div className="relative z-10 container mx-auto py-8 pt-6">

                {/* FEED & SIDEBAR GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT: SOCIAL FEED (8 cols) */}
                    <div className="lg:col-span-8">
                        <div className="flex items-center gap-3 mb-6 border-l-4 border-blue-600 pl-4">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                Feed Coalizão
                            </h2>
                        </div>
                        <SocialFeed />
                    </div>

                    {/* RIGHT: SIDEBAR (4 cols) */}
                    <div className="lg:col-span-4 space-y-4">

                        {/* 1. MEMBER CARD */}
                        <Link href="/dashboard">
                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 relative overflow-hidden group cursor-pointer hover:border-blue-500/30 transition-all shadow-2xl">
                                <div className="flex items-center gap-4 relative z-10">
                                    <Avatar className="w-20 h-20 border-4 border-slate-800 shadow-lg ring-2 ring-white/5">
                                        <AvatarImage src={fullUser?.profilePhotoUrl || undefined} className="object-cover" />
                                        <AvatarFallback className="text-2xl font-bold bg-slate-800 text-slate-400">
                                            {user.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">Road Name</span>
                                        <h3 className="text-2xl font-black text-white leading-none mb-2">
                                            {fullUser?.roadName?.toUpperCase() || user.name?.split(' ')[0].toUpperCase()}
                                        </h3>

                                        {myClub && (
                                            <div className="inline-flex items-center gap-2 bg-blue-950/50 px-3 py-1 rounded-full border border-blue-500/20">
                                                <Shield className="w-3 h-3 text-blue-400" />
                                                <span className="text-xs font-bold text-blue-100">{myClub.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -mr-10 -mt-10" />
                            </div>
                        </Link>

                        {/* 1.5 MY CLUB CARD */}
                        {myClub && (
                            <Link href={`/club/${myClub.id}`}>
                                <div className="group relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-black backdrop-blur-md shadow-2xl cursor-pointer hover:border-amber-500/60 transition-all">
                                    <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />

                                    <div className="p-5 relative z-10 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full border-2 border-amber-500/50 overflow-hidden bg-black/50 shadow-inner flex items-center justify-center">
                                                {myClub.logoUrl ? (
                                                    <img src={myClub.logoUrl} alt={myClub.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Shield className="h-6 w-6 text-amber-500" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-1">
                                                    Meu Moto Clube
                                                </h4>
                                                <h3 className="text-white font-bold text-lg leading-none group-hover:text-amber-400 transition-colors">
                                                    {myClub.name}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="bg-amber-500/20 p-2 rounded-full group-hover:bg-amber-500/40 transition-colors">
                                            <Activity className="w-5 h-5 text-amber-500" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* 2. ROLE CARD */}
                        <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-5 text-center hover:bg-blue-900/30 transition-colors shadow-lg">
                            <h4 className="text-blue-500 font-black tracking-widest text-xl uppercase outline-text drop-shadow-sm">
                                {user?.role === 'admin' ? 'ADMIN GERAL' : user?.role === 'club_admin' ? 'PRESIDENTE' : 'MEMBRO'}
                            </h4>
                        </div>

                        {/* 3. ID CARD */}
                        <div className="bg-green-950/20 border border-green-900/40 rounded-lg p-5 text-center hover:bg-green-900/30 transition-colors shadow-lg">
                            <h4 className="text-green-500 font-mono font-bold tracking-widest text-xl uppercase drop-shadow-sm">
                                {fullUser?.memberId || "ID. INDEFINIDO"}
                            </h4>
                            <span className="text-[10px] text-green-700/60 uppercase tracking-[0.3em] block mt-1 font-bold">Identificação</span>
                        </div>

                        {/* 4. COUNTRY CARD */}
                        {myClub?.country ? (
                            <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-5 flex items-center justify-center gap-4 hover:bg-amber-900/20 transition-colors shadow-lg group">
                                {getCountryFlagUrl(myClub.country) && (
                                    <img src={getCountryFlagUrl(myClub.country)!} alt={myClub.country} className="w-8 h-auto rounded shadow-sm opacity-90 group-hover:opacity-100 transition-opacity" />
                                )}
                                <h4 className="text-amber-500 font-black tracking-widest text-xl uppercase">
                                    {myClub.country}
                                </h4>
                            </div>
                        ) : (
                            <div className="bg-amber-950/20 border border-white/5 rounded-lg p-4 text-center">
                                <span className="text-amber-600/50 text-sm font-mono">NO COUNTRY DATA</span>
                            </div>
                        )}

                        {/* 5. CIN CARD */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-md shadow-2xl mt-4">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="p-5 relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <Shield className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-bold text-amber-500 tracking-wider text-sm">C.I.N.</h3>
                                </div>

                                <p className="text-xs text-slate-500 mb-4 font-mono leading-relaxed">
                                    Coalition Intelligence Network.
                                    <br />
                                    ACESSO RESTRITO / CLASSIFICADO
                                </p>

                                <Link href="/cin">
                                    <Button variant="outline" className="w-full border-amber-500/20 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 bg-transparent h-9 text-xs uppercase tracking-wider font-bold">
                                        Acessar Inteligência
                                    </Button>
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
