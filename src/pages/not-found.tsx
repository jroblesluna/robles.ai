import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from '@shared/seoPolicy';
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.title = t('notFound.title') + ' | Robles.AI';
    document.documentElement.lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
    robots.content = 'noindex,follow';
  }, [t, i18n, i18n.language]);
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">{t('notFound.title')}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {t('notFound.description')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
