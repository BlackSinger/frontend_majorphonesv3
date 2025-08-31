import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';

interface NumberOption {
  id: string;
  number: string;
  price: number;
  country: string;
  countryCode: string;
  duration: number; // Fixed at 30 days
  successRate: number;
  service: string;
}

const EmptySimcard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry] = useState('United States');
  const [searchResults, setSearchResults] = useState<NumberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' }
  ];

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(false);

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const countryCode = countries.find(c => c.name === selectedCountry)?.code || 'US';
      
      // Mock data with fixed 30-day duration for simcard numbers
      const mockResults: NumberOption[] = [
        {
          id: '1',
          number: '+1-555-0123',
          price: 25.00,
          country: selectedCountry,
          countryCode: countryCode,
          duration: 30,
          successRate: 99,
          service: 'Empty Simcard'
        },
        {
          id: '2',
          number: '+1-555-0456',
          price: 25.00,
          country: selectedCountry,
          countryCode: countryCode,
          duration: 30,
          successRate: 98,
          service: 'Empty Simcard'
        },
        {
          id: '3',
          number: '+1-555-0789',
          price: 25.00,
          country: selectedCountry,
          countryCode: countryCode,
          duration: 30,
          successRate: 99,
          service: 'Empty Simcard'
        }
      ];

      setSearchResults(mockResults);
    } catch (error) {
      console.error('Error getting numbers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  return (
    <DashboardLayout currentPath="/emptysimcard">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-teal-600/5 to-blue-600/10"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-cyan-100 to-teal-100 bg-clip-text text-transparent">
                  Empty Simcard
                </h1>
                <p className="text-slate-300 text-lg">Premium virtual numbers with SIM card reliability</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-teal-600/5 to-blue-600/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-400/15 to-cyan-400/15 rounded-full blur-2xl animate-pulse delay-1000"></div>
          
          {!hasSearched ? (
            /* SEARCH VIEW */
            <div className="p-10">
              <div className="relative z-10 max-w-5xl mx-auto">
                {/* Pricing Header */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl mb-6 shadow-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-teal-100 bg-clip-text text-transparent mb-3">
                    Premium Service Pricing
                  </h2>
                  <p className="text-slate-300 text-lg">Premium empty simcard numbers with 30-day validity</p>
                </div>
                
                {/* Pricing Display */}
                <div className="space-y-8">
                  {/* Main Price Card */}
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 shadow-2xl relative overflow-hidden">
                      {/* Premium glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-teal-400/10 rounded-3xl"></div>
                      
                      <div className="relative z-10 text-center">
                        {/* Premium Badge */}
                        <div className="inline-flex items-center bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold px-4 py-2 rounded-full mb-6">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          PREMIUM EMPTY SIMCARD
                        </div>
                        
                        {/* Price */}
                        <div className="mb-6">
                          <div className="text-6xl font-bold text-emerald-400 mb-2">
                            $25.00
                          </div>
                          <div className="text-xl text-slate-300">
                            30 Days Validity • United States Numbers
                          </div>
                        </div>
                        
                        {/* Features */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-slate-300">99% Success Rate</span>
                          </div>
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-slate-300">30 Days Duration</span>
                          </div>
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-slate-300">Premium Quality</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Duration Information */}
                    <div className="flex justify-center">
                      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-cyan-500/30 transition-all duration-300 shadow-lg w-full">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-white font-semibold text-lg">30 Days Duration</span>
                            <p className="text-slate-400 text-sm mt-1">Extended validity period</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Country Information */}
                    <div className="flex justify-center">
                      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-cyan-500/30 transition-all duration-300 shadow-lg w-full">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                            🇺🇸
                          </div>
                          <div>
                            <span className="text-white font-semibold text-lg">United States Only</span>
                            <p className="text-slate-400 text-sm mt-1">Premium US numbers</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Premium Quality */}
                    <div className="flex justify-center">
                      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-cyan-500/30 transition-all duration-300 shadow-lg w-full">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-white font-semibold text-lg">Premium Quality</span>
                            <p className="text-slate-400 text-sm mt-1">Highest success rates</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <div className="text-center pt-4">
                    <button 
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="group px-12 py-5 bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 hover:from-cyan-500 hover:via-teal-500 hover:to-blue-500 text-white font-bold text-xl rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 hover:scale-105 border border-cyan-500/30 hover:border-cyan-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="relative z-10 flex items-center space-x-4">
                        {isSearching ? (
                          <svg className="w-7 h-7 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        )}
                        <span className="group-hover:tracking-wide transition-all duration-300">
                          {isSearching ? 'Processing...' : 'Get Premium Number'}
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
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl mb-6 shadow-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-teal-100 bg-clip-text text-transparent mb-3">
                    Premium Numbers Available
                  </h3>
                  <p className="text-slate-300 text-lg">
                    {searchResults.length > 0 
                      ? `${searchResults.length} premium empty simcard numbers available`
                      : `No premium numbers available at this time`
                    }
                  </p>
                </div>

                {/* Results Grid */}
                {searchResults.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                    {searchResults.map((option) => (
                      <div
                        key={option.id}
                        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 hover:border-cyan-500/50 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] relative overflow-hidden"
                      >
                        {/* Premium Badge */}
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          PREMIUM
                        </div>

                        {/* Number Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center text-xl">
                              {countries.find(c => c.code === option.countryCode)?.flag || '🌍'}
                            </div>
                            <div>
                              <p className="text-white font-bold text-lg">{option.number}</p>
                              <p className="text-slate-400 text-sm">{option.country}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-bold text-2xl">${option.price}</p>
                            <p className="text-slate-400 text-xs">premium price</p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-4 mb-6">
                          {/* Duration */}
                          <div className="flex items-center justify-between py-2">
                            <span className="text-slate-300 font-medium">Duration</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                              <span className="font-semibold text-cyan-400">
                                {option.duration} days
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
                            <span className="text-cyan-400 font-semibold bg-cyan-500/10 px-3 py-1 rounded-lg">
                              {option.service}
                            </span>
                          </div>

                          {/* Quality Badge */}
                          <div className="flex items-center justify-between py-2">
                            <span className="text-slate-300 font-medium">Quality</span>
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="font-semibold text-yellow-400">Premium</span>
                            </div>
                          </div>
                        </div>

                        {/* Purchase Button */}
                        <button className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02]">
                          Purchase Premium Number
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
                    <h4 className="text-2xl font-bold text-slate-300 mb-3">No Premium Numbers Available</h4>
                    <p className="text-slate-400 text-lg">Try searching for a different service.</p>
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

export default EmptySimcard;