import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

interface NumberOption {
  id: string;
  number: string;
  price: number;
  country: string;
  countryCode: string;
  countryPrefix: string;
  duration: number;
  successRate: number;
}

const LongTerm: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [searchResults, setSearchResults] = useState<NumberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const countries = [
    { 
      code: 'US', 
      name: 'United States',
      prefix: '+1',
      flag: (
        <svg className="w-5 h-4 inline-block mr-2" viewBox="0 0 60 40">
          <rect width="60" height="40" fill="#B22234"/>
          <rect width="60" height="3" y="3" fill="white"/>
          <rect width="60" height="3" y="9" fill="white"/>
          <rect width="60" height="3" y="15" fill="white"/>
          <rect width="60" height="3" y="21" fill="white"/>
          <rect width="60" height="3" y="27" fill="white"/>
          <rect width="60" height="3" y="33" fill="white"/>
          <rect width="24" height="21" fill="#3C3B6E"/>
        </svg>
      )
    }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setHasSearched(false);

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const selectedCountryData = countries.find(c => c.name === selectedCountry);
      const countryCode = selectedCountryData?.code || 'US';
      const countryPrefix = selectedCountryData?.prefix || '+1';
      
      // Mock data for long-term numbers (30-day duration)
      const mockResults: NumberOption[] = [
        {
          id: '1',
          number: '555-0123',
          price: 15.50,
          country: selectedCountry,
          countryCode: countryCode,
          countryPrefix: countryPrefix,
          duration: 30,
          successRate: 98
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
    <DashboardLayout currentPath="/long">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                    
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Long Numbers
                </h1>
                <p className="text-slate-300 text-md text-left">Extended 30-day validity numbers</p>
              </div>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          /* SEARCH STATE - Information Section on top */
          <>
            {/* Information Section - Shows above search */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-blue-300 text-sm font-semibold mb-3">Important information about these numbers:</p>
                  <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                    <li>• They can only be used to verify just 1 service</li>
                    <li>• They are valid for 30 days</li>
                    <li>• Their duration can't be extended</li>
                    <li>• After purchased, some can be cancelled and some can't</li>
                    <li>• Users that deposit through Amazon Pay can't purchase them</li>
                    <li>• If you want to verify more than 1 service with the same number, go to <Link to="/emptysimcard" className="text-blue-400 hover:text-blue-300 underline font-semibold">Empty SIM cards</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Main Content Section */}
            <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${isCountryDropdownOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
              {/* SEARCH VIEW */}
              <div className="p-6">
                <div className="relative z-10 mx-auto">
                {/* Search Header */}
                <div className="text-left mb-9">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                    Search For Numbers
                  </h1>
                  <p className="text-slate-300 text-md">Find the service you are looking for</p>
                </div>
                
                {/* Search Form */}
                <div className="space-y-9">
                  {/* Form Elements Container */}
                  <div className="space-y-6">
                    {/* Service Input and Country Selection Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Search Input */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                          Search Service
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <svg className="h-6 w-6 text-emerald-400 group-focus-within:text-emerald-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-3 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50"
                            placeholder="Enter service name"
                          />
                        </div>
                      </div>

                      {/* Country Selection */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                          Select Country
                        </label>
                        <div className="relative group" ref={dropdownRef}>
                          <div
                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            className="w-full pl-12 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <div className="absolute left-4">
                                {countries.find(c => c.name === selectedCountry)?.flag}
                              </div>
                              <span>{selectedCountry}</span>
                            </div>
                          </div>
                          
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          {/* Custom Dropdown Options */}
                          {isCountryDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                              {countries.map((country) => (
                                <div
                                  key={country.code}
                                  onClick={() => {
                                    setSelectedCountry(country.name);
                                    setIsCountryDropdownOpen(false);
                                  }}
                                  className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                >
                                  <div className="mr-1">
                                    {country.flag}
                                  </div>
                                  <span className="text-white">{country.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                    {/* Search Button */}
                    <div className="flex flex-col items-center space-y-3">
                      <button 
                        onClick={handleSearch}
                        disabled={!searchTerm.trim() || isSearching}
                        className="group px-8 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[150px]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="relative z-10 flex items-center justify-center">
                          {isSearching ? (
                            <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <span className="group-hover:tracking-wide transition-all duration-300">
                              <span>Search numbers</span>
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Information Section - Always on top */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-blue-300 text-sm font-semibold mb-3">Important information about these numbers:</p>
                  <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                    <li>• They can only be used to verify just 1 service</li>
                    <li>• They are valid for 30 days</li>
                    <li>• Their duration can't be extended</li>
                    <li>• After purchased, some can be cancelled and some can't</li>
                    <li>• Users that deposit through Amazon Pay can't purchase them</li>
                    <li>• If you want to verify more than 1 service with the same number, go to <Link to="/emptysimcard" className="text-blue-400 hover:text-blue-300 underline font-semibold">Empty SIM cards</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
              <div className="p-6">
                <div className="relative z-10">
                {/* Back Button */}
                <div className="mb-5">
                  <button 
                    onClick={() => setHasSearched(false)}
                    className="group flex items-center space-x-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
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
                <div className="text-left mb-7">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    Number options
                  </h1>
                  <p className="text-slate-300 text-md">
                    {searchResults.length > 0 
                      ? (
                          <span className="flex items-center flex-wrap">
                            Found {searchResults.length} numbers for "{searchTerm}" from {selectedCountry}
                            <span className="ml-2 hidden sm:inline">
                              {countries.find(c => c.name === selectedCountry)?.flag}
                            </span>
                          </span>
                        )
                      : (
                          <span className="flex items-center flex-wrap">
                            No numbers found for "{searchTerm}" in {selectedCountry}
                            <span className="ml-2 hidden sm:inline">
                              {countries.find(c => c.name === selectedCountry)?.flag}
                            </span>
                          </span>
                        )
                    }
                  </p>
                </div>

                {/* Results Grid */}
                {searchResults.length > 0 ? (
                  <div className={`grid gap-6 ${searchResults.length === 1 ? 'grid-cols-1' : 'sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
                    {searchResults.map((option) => (
                      <div
                        key={option.id}
                        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 border-blue-500/50 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:scale-[1.01]" style={{ boxShadow: '0 0 24px rgba(59, 130, 246, 0.25)' }}
                      >
                        {/* Number Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-9 h-9 bg-blue-300/10 rounded-xl flex items-center justify-center">
                              <span className="text-emerald-400 font-bold text-sm">1st</span>
                            </div>
                            <div>
                              <p className="text-white font-bold text-md">Option</p>
                            </div>
                          </div>
                        </div>

                        {/* Details in one line */}
                        <div className="md:flex md:items-center md:justify-between">
                          {/* Mobile Layout */}
                          <div className="md:hidden space-y-3">
                            {/* Price, Duration, Success Rate in two columns */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-md">
                                <span className="text-slate-300 font-medium">Price:</span>
                                <span className="text-emerald-400 font-semibold">
                                  ${option.price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-md">
                                <span className="text-slate-300 font-medium">Duration:</span>
                                <span className="text-emerald-400 font-semibold">
                                  {option.duration} days
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-md">
                                <span className="text-slate-300 font-medium">Success Rate:</span>
                                <span className="text-emerald-400 font-semibold">{option.successRate}%</span>
                              </div>
                            </div>
                            {/* Purchase Button - full width */}
                            <button 
                              onClick={() => navigate('/history')}
                              className="w-full px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] text-md"
                            >
                              Purchase
                            </button>
                          </div>

                          {/* Desktop Layout - unchanged */}
                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Price:</span>
                            <span className="text-emerald-400 font-semibold">
                              ${option.price.toFixed(2)}
                            </span>
                          </div>

                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Duration:</span>
                            <span className="text-emerald-400 font-semibold">
                              {option.duration} days
                            </span>
                          </div>

                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Success Rate:</span>
                            <span className="text-emerald-400 font-semibold">{option.successRate}%</span>
                          </div>

                          <button 
                            onClick={() => navigate('/history')}
                            className="hidden md:block px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] text-sm"
                          >
                            Purchase
                          </button>
                        </div>
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
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LongTerm;