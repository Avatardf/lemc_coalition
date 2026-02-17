
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Printer, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCountryFlagUrl } from "@shared/countries";

export default function ClubCertificatePage() {
    const { id } = useParams();
    const clubId = parseInt(id || "0");
    const { data: club, isLoading } = trpc.motoClubs.get.useQuery({ id: clubId }, { enabled: !!clubId });
    const { data: allClubs } = trpc.motoClubs.list.useQuery();

    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        // Load Old English font
        const link = document.createElement("link");
        link.href = "https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }, []);

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
    };

    if (isLoading || !club) {
        return <div className="min-h-screen flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin" /></div>;
    }

    // Get unique countries from all clubs for the footer flags
    const uniqueCountries = Array.from(new Set(allClubs?.map(c => c.country).filter(Boolean) as string[]));

    return (
        <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-4">

            {/* Controls - Hidden on print */}
            <div className="mb-8 flex gap-4 print:hidden">
                <Button onClick={handlePrint} className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
                    <Printer className="w-5 h-5" /> Imprimir / Salvar PDF
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                    Voltar
                </Button>
            </div>

            {/* Certificate Container */}
            <div className="w-[1100px] h-[800px] bg-black text-white relative flex flex-col items-center text-center p-12 border-[20px] border-double border-slate-800 shadow-2xl print:shadow-none print:w-[100%] print:h-[100vh] print:border-none overflow-hidden certificate-bg">

                {/* Background Texture Overlay (Optional) */}
                <div className="absolute inset-0 bg-[url('/road-background.jpg')] opacity-10 bg-cover bg-center mix-blend-overlay print:opacity-20 pointer-events-none" />

                {/* Header Logo */}
                <div className="w-32 h-32 mb-4 z-10">
                    {/* Placeholder for Coalition Logo if available, using Shield for now or club logo if represents coalition */}
                    <Shield className="w-full h-full text-red-600" />
                </div>

                {/* Title */}
                <h1 className="text-6xl mb-2 z-10" style={{ fontFamily: "'UnifrakturMaguntia', cursive", textShadow: "0 0 10px rgba(255,255,255,0.3)" }}>
                    Certificate of Membership
                </h1>

                {/* Subtitle */}
                <h2 className="text-xl font-bold tracking-[0.2em] mb-12 text-slate-400 z-10 uppercase">
                    INTERNATIONAL COALITION OF LAW ENFORCEMENT MOTORCYCLE CLUBS
                </h2>

                {/* Certification Text */}
                <p className="text-lg text-slate-300 font-serif italic mb-6 z-10">
                    This is to certify that the
                </p>

                {/* Club Name */}
                <h3 className="text-5xl mb-8 z-10 text-white" style={{ fontFamily: "'UnifrakturMaguntia', cursive" }}>
                    {club.name}
                </h3>

                {/* Body Text */}
                <p className="text-lg text-slate-300 font-serif leading-relaxed max-w-4xl mb-8 z-10 px-12 text-justify">
                    Whose dedication and principles embody the core values of camaraderie, integrity, and mutual respect, has been officially recognized as a member of the International Coalition of Law Enforcement Motorcycle Clubs. This membership acknowledges the club's commitment to fostering the ideals of brotherhood, mutual support, and strengthening the bonds among law enforcement motorcycle organizations worldwide.
                </p>

                {/* Date */}
                <div className="mt-4 mb-12 z-10 text-xl font-serif">
                    <span className="text-slate-400">Date of Admission: </span>
                    <span className="font-bold text-white border-b border-slate-600 px-4">
                        {club.admissionDate ? new Date(club.admissionDate).toLocaleDateString('pt-BR') : (club.foundingDate ? new Date(club.foundingDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'))}
                    </span>
                </div>

                {/* Footer Text */}
                <p className="text-sm text-slate-500 font-serif mb-8 z-10 max-w-3xl">
                    On behalf of the International Coalition of Law Enforcement Motorcycle Clubs, we extend our warmest welcome to this esteemed brotherhood, wishing you continued success in your journeys and endeavors.
                </p>

                {/* Footer Badges/Flags - Displaying Member Nations */}
                <div className="mt-auto w-full z-10 border-t border-slate-800 pt-6">
                    <div className="flex justify-center gap-4 flex-wrap px-12">
                        {uniqueCountries.map(code => (
                            <div key={code} className="flex flex-col items-center gap-1">
                                {getCountryFlagUrl(code) && (
                                    <img src={getCountryFlagUrl(code)!} alt={code} className="w-10 h-auto shadow opacity-80" />
                                )}
                                <span className="text-[10px] text-slate-600 font-bold">{code}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <style>{`
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { background: black; -webkit-print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    .certificate-bg { width: 100vw; height: 100vh; border: none; box-shadow: none; padding: 40px; }
                }
            `}</style>
        </div>
    );
}

