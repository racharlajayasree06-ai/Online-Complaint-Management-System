import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, User, Landmark, Key, Phone, Mail, FileText, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { loginCitizen, loginOfficer, registerCitizen, registerOfficer } from '../lib/api';
import LanguageSelector from './LanguageSelector';

interface LandingViewProps {
  onLoginSuccess: () => void;
}

export default function LandingView({ onLoginSuccess }: LandingViewProps) {
  const { t } = useTranslation();
  
  // Gate toggle: 'citizen' | 'officer'
  const [gate, setGate] = useState<'citizen' | 'officer'>('citizen');
  // Form toggle: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Input states
  const [identifier, setIdentifier] = useState(''); // citizen: email or phone
  const [password, setPassword] = useState('');
  const [officerIdInput, setOfficerIdInput] = useState(''); // officer ID

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [address, setAddress] = useState('');
  const [designation, setDesignation] = useState('VRO');
  const [department, setDepartment] = useState('Revenue Department');
  const [officeLocation, setOfficeLocation] = useState('Tahsildar Office');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (gate === 'citizen') {
        if (mode === 'login') {
          await loginCitizen(identifier, password);
        } else {
          await registerCitizen({ fullName, email, mobile, aadhaar, address, password });
        }
      } else {
        if (mode === 'login') {
          await loginOfficer(officerIdInput, password);
        } else {
          await registerOfficer({ fullName, officerId: officerIdInput, designation, department, officeLocation, email, mobile, password });
        }
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="landing-page-wrapper" className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Upper Navigation Header bar */}
      <header id="landing-header" className="bg-white border-b border-slate-100 py-3.5 px-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-50 border border-brand-100 rounded-xl">
            <Landmark className="w-5 h-5 text-brand-650 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">{t('common.title')}</h1>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{t('common.subtitle')}</p>
          </div>
        </div>
        <LanguageSelector />
      </header>

      {/* Hero and Form Container split */}
      <main id="landing-main" className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column (Hero Content) */}
        <div id="landing-hero" className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-brand-50/80 border border-brand-100 px-3.5 py-1 rounded-full">
            <Shield className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">{t('landing.governanceText')}</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            <span className="text-brand-600">Prajavani Grievance Portal</span>
          </h2>

          <p className="text-xs text-slate-500 leading-relaxed max-w-lg font-medium">
            {t('landing.welcomeMsg')}
          </p>

          <div id="hero-feature-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pt-4 font-semibold text-[11px] text-slate-600">
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center space-x-3 shadow-sm">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>Digital Docket Tracking</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center space-x-3 shadow-sm">
              <Landmark className="w-4 h-4 text-blue-500" />
              <span>Hierarchical Action Escalation</span>
            </div>
          </div>
        </div>

        {/* Right Column (Form Gateway) */}
        <div id="landing-auth-card" className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg space-y-5">
          {/* Gate Toggle (Citizen vs Officer) */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              id="citizen-gate-btn"
              onClick={() => { setGate('citizen'); setMode('login'); setError(''); setShowPassword(false); }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${gate === 'citizen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t('landing.citizenPanelTitle')}
            </button>
            <button
              id="officer-gate-btn"
              onClick={() => { setGate('officer'); setMode('login'); setError(''); setShowPassword(false); }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${gate === 'officer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t('landing.officerPanelTitle')}
            </button>
          </div>

          <div id="auth-title-stack" className="text-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {gate === 'citizen'
                ? (mode === 'login' ? t('auth.citizenLoginTitle') : t('auth.citizenRegisterTitle'))
                : (mode === 'login' ? t('auth.officerLoginTitle') : t('auth.officerRegisterTitle'))}
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Please authorize your credentials to proceed inside the cockpit.</p>
          </div>

          {error && (
            <div id="auth-error-alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold text-center leading-normal">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            {/* Common Profile Registration Fields */}
            {mode === 'register' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.fullName')}</label>
                  <input
                    id="register-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:bg-white outline-none"
                    placeholder="Enter full legal name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.email')}</label>
                    <input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:bg-white outline-none"
                      placeholder="e.g. citizen@gmail.com"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.phoneNumber')}</label>
                    <input
                      id="register-mobile"
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:bg-white outline-none"
                      placeholder="10-digit mobile"
                      required
                    />
                  </div>
                </div>

                {gate === 'citizen' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.aadhaar')}</label>
                      <input
                        id="register-aadhaar"
                        type="text"
                        value={aadhaar}
                        onChange={(e) => setAadhaar(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:bg-white outline-none"
                        placeholder="12-digit Aadhaar Number"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.address')}</label>
                      <textarea
                        id="register-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:bg-white outline-none resize-none"
                        rows={2}
                        placeholder="Residential address details"
                        required
                      ></textarea>
                    </div>
                  </>
                ) : (
                  // Officer Fields
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.designation')}</label>
                        <select
                          id="register-designation"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="VRO">VRO (Village)</option>
                          <option value="MRO">MRO/Tahsildar (Mandal)</option>
                          <option value="RDO">RDO (Revenue Division)</option>
                          <option value="DRO">DRO (District Office)</option>
                          <option value="Collector">District Collector (IAS)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.officerId')}</label>
                        <input
                          id="register-officerid"
                          type="text"
                          value={officerIdInput}
                          onChange={(e) => setOfficerIdInput(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:bg-white outline-none"
                          placeholder="e.g. MRO890"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.department')}</label>
                        <input
                          id="register-department"
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:bg-white outline-none"
                          placeholder="Revenue Department"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.officeLocation')}</label>
                        <input
                          id="register-officeloc"
                          type="text"
                          value={officeLocation}
                          onChange={(e) => setOfficeLocation(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:bg-white outline-none"
                          placeholder="Mandal tahsil office"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Login Mode Fields */}
            {mode === 'login' && (
              <div className="space-y-4">
                {gate === 'citizen' ? (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.fullName')} / Phone</label>
                    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded">
                      <User className="absolute left-2.5 w-4 h-4 text-slate-400" />
                      <input
                        id="login-citizen-ident"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 bg-transparent outline-none focus:bg-white"
                        placeholder="Email or Mobile"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.officerId')}</label>
                    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded">
                      <Shield className="absolute left-2.5 w-4 h-4 text-slate-400" />
                      <input
                        id="login-officer-id"
                        type="text"
                        value={officerIdInput}
                        onChange={(e) => setOfficerIdInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 bg-transparent outline-none focus:bg-white"
                        placeholder="Officer ID (e.g. MRO890)"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password input block for BOTH login and register */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400">{t('auth.password')}</label>
              <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded">
                <Key className="absolute left-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs font-semibold text-slate-700 bg-transparent outline-none focus:bg-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 border border-slate-800 text-white font-bold p-2.5 rounded-lg text-xs cursor-pointer shadow-md hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1.5"
            >
              <span>{loading ? t('common.loading') : (mode === 'login' ? t('auth.loginButton') : t('auth.registerButton'))}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Form Mode button */}
          <div id="form-toggle-link" className="text-center pt-2">
            <button
              id="mode-toggle-btn"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setShowPassword(false); }}
              className="text-xs font-bold text-brand-600 hover:underline cursor-pointer"
            >
              {mode === 'login' ? t('auth.dontHaveAccount') + ' ' + t('auth.registerNow') : t('auth.alreadyHaveAccount') + ' ' + t('auth.loginNow')}
            </button>
          </div>
        </div>
      </main>

      {/* Footer credits bar */}
      <footer id="landing-footer" className="bg-white border-t border-slate-100 py-3 text-center shrink-0">
        <p className="text-[10px] font-semibold text-slate-400">© 2026 Revenue Administration Office. All rights reserved.</p>
      </footer>
    </div>
  );
}
