import { useTranslation } from 'react-i18next';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLoginUrl } from '@/const';
import { Link } from 'wouter';
import { Shield, Users, Globe, Calendar, MapPin, Bike, ArrowRight } from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Shield,
      title: 'Law Enforcement Brotherhood',
      description: 'A global coalition uniting law enforcement motorcycle clubs worldwide',
      color: 'text-primary',
    },
    {
      icon: Users,
      title: 'International Community',
      description: 'Members from multiple countries sharing values of loyalty, honor, and respect',
      color: 'text-secondary',
    },
    {
      icon: Globe,
      title: 'Global Network',
      description: 'Connecting riders across continents through shared passion and purpose',
      color: 'text-accent',
    },
  ];

  const timeline = [
    {
      year: '2015',
      event: 'Coalition Founded',
      description: 'Born from an alliance between Brazilian and Chilean clubs on September 30',
    },
    {
      year: '2015',
      event: 'First International Event',
      description: 'Chile hosted the inaugural LEMC gathering in November',
    },
    {
      year: '2016-2019',
      event: 'Expansion Era',
      description: 'Events in Brasília, Rio de Janeiro, and Florida expanded the coalition',
    },
    {
      year: '2022',
      event: 'Post-Pandemic Revival',
      description: 'Coalition resumed in-person gatherings with renewed strength',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-20 md:py-32">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-4xl">LE</span>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t('home.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 italic">
              {t('home.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Button size="lg" asChild className="text-lg">
                    <Link href="/profile">
                      <a className="flex items-center gap-2">
                        {t('nav.profile')}
                        <ArrowRight className="h-5 w-5" />
                      </a>
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-lg">
                    <Link href="/passport">
                      <a className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {t('nav.passport')}
                      </a>
                    </Link>
                  </Button>
                </>
              ) : (
                <Button size="lg" asChild className="text-lg">
                  <a href={getLoginUrl()} className="flex items-center gap-2">
                    {t('nav.login')}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.mission')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Building bridges between law enforcement motorcycle clubs across the globe
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.history')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From regional alliance to global brotherhood
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <Card className="border-2">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div className="prose prose-lg max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      On <strong>September 30, 2015</strong>, a new alliance began to take shape in the law enforcement motorcycle club universe. What started as an initiative between clubs from Brazil and Chile quickly evolved into something much larger, with the addition of Puerto Rico in November of the same year.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      The coalition's operation follows a philosophy based on <strong>pro-tempore presidency</strong> — a dynamic system in which the group's leadership is the responsibility of the host motorcycle club of the next major coalition gathering. This mechanism ensures decentralized administration, encouraging active participation from all members.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Over the years, the coalition has expanded its presence, bringing together motorcycle clubs from various countries and strengthening the bonds between motorcyclists who share not only a love for the road, but also the values of <strong>loyalty, honor, and respect</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.events')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Key milestones in our journey
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6">
              {timeline.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">
                        {item.year}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{item.event}</CardTitle>
                        <CardDescription className="text-base">{item.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        <div className="container">
          <Card className="max-w-3xl mx-auto border-2 shadow-2xl">
            <CardContent className="p-12 text-center">
              <Bike className="h-16 w-16 mx-auto mb-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Join the Brotherhood
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Be part of a global community of law enforcement riders united by passion, purpose, and the open road.
              </p>
              {!isAuthenticated && (
                <Button size="lg" asChild className="text-lg">
                  <a href={getLoginUrl()} className="flex items-center gap-2 mx-auto w-fit">
                    {t('nav.login')}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
