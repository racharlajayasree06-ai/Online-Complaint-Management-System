import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { updatePreferredLang, getSession } from '../lib/api';

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLangChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    
    // Lazy sync back to backend if logged in
    const session = getSession();
    if (session) {
      try {
        await updatePreferredLang(lang);
      } catch (err) {
        console.error('Failed to sync preferred language online:', err);
      }
    }
  };

  return (
    <div id="language-selector-wrapper" className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm hover:border-slate-300 transition-colors">
      <Globe id="globe-icon" className="w-4 h-4 text-slate-500" />
      <select
        id="lang-select"
        value={i18n.language || 'en'}
        onChange={handleLangChange}
        className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
      >
        <option value="en">English (EN)</option>
        <option value="te">తెలుగు (TE)</option>
        <option value="hi">हिन्दी (HI)</option>
      </select>
    </div>
  );
}
