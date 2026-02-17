import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { toast } from "sonner";
import { Shield, Mail, Lock, Loader2, Chrome } from 'lucide-react';
import { useLocation } from "wouter";

export default function Login() {
    const { t } = useTranslation();
    const [location, setLocation] = useLocation();
    const utils = trpc.useContext();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState<'login' | 'change_password'>('login');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        if (error === 'pending') {
            toast.warning("Seu cadastro foi recebido e aguarda aprovação do Presidente.");
        } else if (error === 'rejected') {
            toast.error("Seu cadastro foi recusado. Entre em contato com a administração.");
        }
    }, []);

    const loginMutation = trpc.auth.loginWithPassword.useMutation({
        onSuccess: (data) => {
            if (data.mustChangePassword) {
                setStep('change_password');
                toast.info("Por segurança, você deve alterar sua senha provisória.");
            } else {
                toast.success("Login realizado com sucesso!");
                window.location.href = '/';
            }
        },
        onError: (error) => {
            toast.error(error.message || "Erro ao realizar login.");
        }
    });

    const changePasswordMutation = trpc.auth.changePassword.useMutation({
        onSuccess: () => {
            toast.success("Senha alterada com sucesso! Acesso liberado.");
            window.location.href = '/';
        },
        onError: (error) => {
            toast.error(error.message || "Erro ao alterar senha.");
        }
    });

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.warning("Preencha e-mail e senha.");
            return;
        }
        loginMutation.mutate({ email, password });
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("As senhas não conferem.");
            return;
        }
        if (newPassword.length < 6) {
            toast.warning("A senha deve ter pelo menos 6 caracteres.");
            return;
        }
        changePasswordMutation.mutate({ newPassword });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663244944167/nqssBQvTWvyHoGTe.jpg')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/80" />

            <Card className="z-10 w-full max-w-md bg-slate-900/90 border-slate-800 text-slate-100 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                        <Shield className="w-8 h-8 text-amber-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-amber-500 tracking-wider">
                        {step === 'login' ? 'LEMC LOGIN' : 'DEFINIR NOVA SENHA'}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        {step === 'login'
                            ? 'Acesso restrito para membros da coalizão.'
                            : 'Defina uma senha pessoal e segura para continuar.'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {step === 'login' ? (
                        <div className="space-y-6">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail Operacional</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="agente@lemc.com"
                                            className="pl-9 bg-slate-950 border-slate-800 focus:border-amber-500"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Senha de Acesso</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-9 bg-slate-950 border-slate-800 focus:border-amber-500 check-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold" disabled={loginMutation.isPending}>
                                    {loginMutation.isPending ? <Loader2 className="animate-spin" /> : 'ENTRAR NA BASE'}
                                </Button>
                            </form>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <Separator className="w-full bg-slate-800" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-900 px-2 text-slate-500">Ou continue com</span>
                                </div>
                            </div>

                            <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 hover:text-white" asChild>
                                <a href={getLoginUrl()} className="flex items-center justify-center gap-2">
                                    <Chrome className="h-5 w-5" />
                                    Google Workspace
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="p-3 bg-amber-900/20 border border-amber-900/50 rounded text-amber-200 text-sm mb-4">
                                Seu login foi criado com uma senha temporária. Para sua segurança, defina uma nova senha agora.
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nova Senha</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    className="bg-slate-950 border-slate-800"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    className="bg-slate-950 border-slate-800"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" disabled={changePasswordMutation.isPending}>
                                {changePasswordMutation.isPending ? <Loader2 className="animate-spin" /> : 'ATUALIZAR CREDENCIAIS'}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="justify-center">
                    <Button variant="link" className="text-slate-500 text-xs" onClick={() => window.location.href = '/'}>
                        Voltar para a página inicial
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
