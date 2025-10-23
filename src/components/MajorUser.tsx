import React, { useState } from 'react';

const MajorUser: React.FC = () => {
  const [email, setEmail] = useState('');
  const [selectedType, setSelectedType] = useState('numbers');

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  User
                </h1>
                <p className="text-slate-300 text-md text-left">View the user's info</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
          <div className="space-y-6 flex flex-col items-center">
            {/* Email Search Bar */}
            <div className="w-full max-w-sm">
              <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
                className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-500"
              />
            </div>

            {/* Search Button */}
            <div className="w-full max-w-sm">
              <button
                type="button"
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default MajorUser;