import React from 'react';
import { Link } from 'react-router-dom';

export const DOWNLOAD_URL = 'https://www.majorphones.com/downloads/MajorStealth-1.1.0-x64-Setup.exe';

const features = [
    {
        title: 'Isolated cookies',
        description: 'Each profile keeps its own cookies and sessions, so logging into an account in one profile never affects the others.',
        icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
    },
    {
        title: 'Separate fingerprints',
        description: 'Every profile presents its own browser fingerprint, so websites see each profile as a different browser.',
        icon: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4'
    },
    {
        title: 'Private history',
        description: 'Browsing history, cache and stored site data stay inside the profile that created them.',
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
        title: 'Settings per profile',
        description: 'Proxy and the rest of the configuration are saved separately for each profile, ready every time you open it.',
        icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'
    }
];

const steps = [
    'Download the installer and run it on Windows (64-bit)',
    'Sign in with your MajorPhones account',
    'Create a profile for each identity you need and launch it'
];

const PrivacyBrowser: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                        Privacy Browser
                    </h1>
                    <p className="text-slate-300 text-md text-left">MajorStealth: browser profiles that stay isolated from each other</p>
                </div>
            </div>

            {/* Beta notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4">
                <p className="text-center text-sm">
                    <span className="text-amber-300 font-bold">BETA</span>
                    <span className="text-slate-300 mx-2">—</span>
                    <span className="text-slate-200">
                        MajorStealth is in beta. If you have any questions or find an error, please report it through our official channels:{' '}
                        <Link to="/tickets" className="text-amber-300 hover:text-amber-200 underline font-semibold">Tickets</Link>,{' '}
                        <a href="https://t.me/MajorPhones" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:text-amber-200 underline font-semibold">Telegram</a> or{' '}
                        <a href="mailto:support@majorphones.com" className="text-amber-300 hover:text-amber-200 underline font-semibold">support@majorphones.com</a>
                    </span>
                </p>
            </div>

            {/* Download */}
            <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="text-left">
                        <h2 className="text-xl font-bold text-white">MajorStealth 1.1.0</h2>
                        <p className="text-slate-300 text-sm mt-1">Windows 64-bit · Installer, about 120 MB</p>
                        <p className="text-slate-400 text-sm mt-1">You need a MajorPhones account to sign in to the browser.</p>
                    </div>
                    <a
                        href={DOWNLOAD_URL}
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download for Windows
                    </a>
                </div>
                <div className="mt-6 bg-slate-800/50 border border-slate-600/50 rounded-2xl p-4 text-left">
                    <p className="text-amber-300 text-sm font-semibold">Windows may warn you before installing</p>
                    <p className="text-slate-300 text-sm mt-1">
                        The installer is not code-signed yet, so Windows SmartScreen may show "Windows protected your PC" or an unknown publisher warning.
                        To continue, click <span className="text-white font-semibold">More info</span> and then <span className="text-white font-semibold">Run anyway</span>.
                        Your browser may also ask you to confirm the download; choose <span className="text-white font-semibold">Keep</span>.
                    </p>
                    <p className="text-slate-400 text-xs mt-2">Only download MajorStealth from this page.</p>
                </div>
            </div>

            {/* Features */}
            <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
                <h2 className="text-left text-xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                    Everything stays inside its profile
                </h2>
                <p className="text-slate-300 text-sm text-left mb-6">
                    Use several accounts on the same computer without them being linked to each other.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {features.map(feature => (
                        <div key={feature.title} className="bg-slate-800/50 border border-slate-600/50 rounded-2xl p-4 text-left flex gap-4">
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.icon} />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">{feature.title}</h3>
                                <p className="text-slate-300 text-sm mt-1">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Getting started */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4">
                <div className="flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-blue-300 text-sm font-semibold mb-3">How to get started:</p>
                        <ol className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                            {steps.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyBrowser;
