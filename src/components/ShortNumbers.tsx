import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';

interface NumberOption {
  id: string;
  number: string;
  price: number;
  country: string;
  countryCode: string;
  isReusable: boolean;
  successRate: number;
  service: string;
}

const ShortNumbers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [reuseEnabled, setReuseEnabled] = useState(false);
  const [searchResults, setSearchResults] = useState<NumberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'IN', name: 'India', flag: '🇮🇳' }
  ];

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setHasSearched(false);

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const countryCode = countries.find(c => c.name === selectedCountry)?.code || 'US';
      
      // Mock data - replace with actual API response
      const mockResults: NumberOption[] = [
        {
          id: '1',
          number: '+1-555-0123',
          price: 0.15,
          country: selectedCountry,
          countryCode: countryCode,
          isReusable: true,
          successRate: 95,
          service: searchTerm
        },
        {
          id: '2',
          number: '+1-555-0456',
          price: 0.12,
          country: selectedCountry,
          countryCode: countryCode,
          isReusable: false,
          successRate: 88,
          service: searchTerm
        },
        {
          id: '3',
          number: '+1-555-0789',
          price: 0.18,
          country: selectedCountry,
          countryCode: countryCode,
          isReusable: reuseEnabled,
          successRate: 92,
          service: searchTerm
        }
      ];

      setSearchResults(mockResults);
    } catch (error) {
      console.error('Error searching numbers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  return (
    <DashboardLayout currentPath="/short">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-cyan-600/10"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Short Numbers
                </h1>
                <p className="text-slate-300 text-lg">Fast verification for popular services</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-green-600/5 to-teal-600/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-400/20 to-green-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal-400/15 to-emerald-400/15 rounded-full blur-2xl animate-pulse delay-1000"></div>
          
          {!hasSearched ? (
            /* SEARCH VIEW */
            <div className="p-10">
              <div className="relative z-10 max-w-5xl mx-auto">
                {/* Search Header */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl mb-6 shadow-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-3">
                    Search & Configure
                  </h2>
                  <p className="text-slate-300 text-lg">Find and configure your short number service</p>
                </div>
                
                {/* Search Form */}
                <div className="space-y-8">
                  {/* Input Fields */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Search Input */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                        Search Services
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                          <svg className="h-6 w-6 text-emerald-400 group-focus-within:text-emerald-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-14 pr-6 py-5 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 backdrop-blur-sm text-lg shadow-inner hover:border-slate-500/50"
                          placeholder="Enter service name..."
                        />
                      </div>
                    </div>

                    {/* Country Selection */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                        Select Country
                      </label>
                      <div className="relative group">
                        <select
                          value={selectedCountry}
                          onChange={(e) => setSelectedCountry(e.target.value)}
                          className="w-full px-6 py-5 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 backdrop-blur-sm appearance-none cursor-pointer text-lg shadow-inner hover:border-slate-500/50"
                        >
                          {countries.map((country) => (
                            <option key={country.code} value={country.name} className="bg-slate-800">
                              {country.flag} {country.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
                          <svg className="h-6 w-6 text-emerald-400 group-focus-within:text-emerald-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reuse Toggle */}
                  <div className="flex justify-center">
                    <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-emerald-500/30 transition-all duration-300 shadow-lg">
                      <div className="flex items-center space-x-6">
                        <button
                          onClick={() => setReuseEnabled(!reuseEnabled)}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 shadow-lg ${
                            reuseEnabled ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                              reuseEnabled ? 'translate-x-7 shadow-emerald-500/50' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <div>
                          <span className="text-white font-semibold text-lg">Enable Reuse</span>
                          <p className="text-slate-400 text-sm mt-1">Allow number reuse for same service</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search Button */}
                  <div className="text-center pt-4">
                    <button 
                      onClick={handleSearch}
                      disabled={!searchTerm.trim() || isSearching}
                      className="group px-12 py-5 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-xl rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="relative z-10 flex items-center space-x-4">
                        {isSearching ? (
                          <svg className="w-7 h-7 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-7 h-7 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        )}
                        <span className="group-hover:tracking-wide transition-all duration-300">
                          {isSearching ? 'Searching...' : 'Search Available Numbers'}
                        </span>
                        {!isSearching && (
                          <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* RESULTS VIEW */
            <div className="p-8">
              <div className="relative z-10">
                {/* Back Button */}
                <div className="mb-8">
                  <button 
                    onClick={() => setHasSearched(false)}
                    className="group flex items-center space-x-3 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-slate-400 group-hover:text-white font-medium transition-colors duration-300">
                      Back to Search
                    </span>
                  </button>
                </div>

                {/* Results Header */}
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-6 shadow-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-3">
                    Available Numbers
                  </h3>
                  <p className="text-slate-300 text-lg">
                    {searchResults.length > 0 
                      ? `Found ${searchResults.length} numbers for "${searchTerm}" in ${selectedCountry}`
                      : `No numbers found for "${searchTerm}" in ${selectedCountry}`
                    }
                  </p>
                </div>

                {/* Results Grid */}
                {searchResults.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                    {searchResults.map((option) => (
                      <div
                        key={option.id}
                        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]"
                      >
                        {/* Number Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-xl">
                              {countries.find(c => c.code === option.countryCode)?.flag || '🌍'}
                            </div>
                            <div>
                              <p className="text-white font-bold text-lg">{option.number}</p>
                              <p className="text-slate-400 text-sm">{option.country}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-bold text-2xl">${option.price}</p>
                            <p className="text-slate-400 text-xs">per SMS</p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-4 mb-6">
                          {/* Reusability */}
                          <div className="flex items-center justify-between py-2">
                            <span className="text-slate-300 font-medium">Reusable</span>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${option.isReusable ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                              <span className={`font-semibold ${option.isReusable ? 'text-emerald-400' : 'text-red-400'}`}>
                                {option.isReusable ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>

                          {/* Success Rate */}
                          <div className="py-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-300 font-medium">Success Rate</span>
                              <span className="text-emerald-400 font-semibold">{option.successRate}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${option.successRate}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Service */}
                          <div className="flex items-center justify-between py-2">
                            <span className="text-slate-300 font-medium">Service</span>
                            <span className="text-blue-400 font-semibold bg-blue-500/10 px-3 py-1 rounded-lg">
                              {option.service}
                            </span>
                          </div>
                        </div>

                        {/* Purchase Button */}
                        <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]">
                          Purchase Number
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* No Results State */
                  <div className="text-center py-16 max-w-md mx-auto">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-2xl mb-6">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.007-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0C17.742 7.324 20.467 9.45 21 12.017M9 6.306C6.258 7.324 3.533 9.45 3 12.017" />
                      </svg>
                    </div>
                    <h4 className="text-2xl font-bold text-slate-300 mb-3">No Numbers Available</h4>
                    <p className="text-slate-400 text-lg">Try searching for a different service or country.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ShortNumbers;