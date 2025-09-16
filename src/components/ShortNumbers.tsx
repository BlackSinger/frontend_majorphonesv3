import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

interface NumberOption {
  id: string;
  number: string;
  price: number;
  extraSmsPrice?: number;
  country: string;
  countryCode: string;
  countryPrefix: string;
  isReusable: boolean;
  receiveSend?: boolean;
  successRate: number;
}

const ShortNumbers: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [numberType, setNumberType] = useState<'single' | 'reusable' | 'receive-send'>('single');
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
    },
    { 
      code: 'GB', 
      name: 'United Kingdom',
      prefix: '+44',
      flag: (
        <svg className="w-5 h-4 inline-block mr-2" viewBox="0 0 60 40">
          <rect width="60" height="40" fill="#012169"/>
          <path d="M0 0L60 40M60 0L0 40" stroke="white" strokeWidth="4"/>
          <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="2"/>
          <path d="M30 0V40M0 20H60" stroke="white" strokeWidth="8"/>
          <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="4"/>
        </svg>
      )
    },
    { 
      code: 'DE', 
      name: 'Germany',
      prefix: '+49',
      flag: (
        <svg className="w-5 h-4 inline-block mr-2" viewBox="0 0 60 40">
          <rect width="60" height="13" fill="#000000"/>
          <rect width="60" height="14" y="13" fill="#DD0000"/>
          <rect width="60" height="13" y="27" fill="#FFCE00"/>
        </svg>
      )
    },
    { 
      code: 'FR', 
      name: 'France',
      prefix: '+33',
      flag: (
        <svg className="w-5 h-4 inline-block mr-2" viewBox="0 0 60 40">
          <rect width="20" height="40" fill="#002395"/>
          <rect width="20" height="40" x="20" fill="white"/>
          <rect width="20" height="40" x="40" fill="#ED2939"/>
        </svg>
      )
    },
    { 
      code: 'IN', 
      name: 'India',
      prefix: '+91',
      flag: (
        <svg className="w-5 h-4 inline-block mr-2" viewBox="0 0 60 40">
          <rect width="60" height="13" fill="#FF9933"/>
          <rect width="60" height="14" y="13" fill="white"/>
          <rect width="60" height="13" y="27" fill="#138808"/>
          <circle cx="30" cy="20" r="6" fill="none" stroke="#000080" strokeWidth="1"/>
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
      
      const singleUseNumbers: NumberOption[] = [
        {
          id: '1',
          number: '555-1001',
          price: 0.08,
          country: selectedCountry,
          countryCode: countryCode,
          countryPrefix: countryPrefix,
          isReusable: false,
          successRate: 98
        },
        {
          id: '2',
          number: '555-1002',
          price: 0.06,
          country: selectedCountry,
          countryCode: countryCode,
          countryPrefix: countryPrefix,
          isReusable: false,
          successRate: 94
        },
        {
          id: '3',
          number: '555-1003',
          price: 0.10,
          country: selectedCountry,
          countryCode: countryCode,
          countryPrefix: countryPrefix,
          isReusable: false,
          successRate: 91
        }
      ];

      const reusableNumbers: NumberOption[] = [
        {
          id: '4',
          number: '555-0123',
          price: 1.2,
          extraSmsPrice: 0.6,
          country: selectedCountry,
          countryCode: countryCode,
          countryPrefix: countryPrefix,
          isReusable: true,
          successRate: 95
        }
      ];

      const receiveSendNumbers: NumberOption[] = [
        {
          id: '5',
          number: '555-2001',
          price: 0.15,
          country: selectedCountry,
          countryCode: countryCode,
          countryPrefix: countryPrefix,
          isReusable: false,
          receiveSend: true,
          successRate: 97
        }
      ];

      // Select appropriate array based on number type
      let mockResults: NumberOption[] = [];
      switch (numberType) {
        case 'single':
          mockResults = singleUseNumbers;
          break;
        case 'reusable':
          mockResults = reusableNumbers;
          break;
        case 'receive-send':
          mockResults = receiveSendNumbers;
          break;
        default:
          mockResults = singleUseNumbers;
      }

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
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                    
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Short Numbers
                </h1>
                <p className="text-slate-300 text-md text-left">Fast verification for popular services</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Section - Always on top */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-blue-300 text-sm font-semibold mb-3">Important information about these numbers:</p>
              <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                <li>• They can only be reused if you select the Reusable option, reusable numbers last 12 hours</li>
                <li>• They can only receive/send SMS if you select the Receive/Send option, they can receive 1 code and send multiple SMS</li>
                <li>• Receive/Send numbers last 5 minutes and you can only send SMS if the code has arrived</li>
                <li>• They can't be refunded once a code arrives</li>
                <li>• Cancelled and timed out (no code arrived) numbers are automatically refunded</li>
                <li>• If you want to verify 1 service more than once, go to <Link to="/middle" className="text-blue-400 hover:text-blue-300 underline font-semibold">Middle</Link> or <Link to="/long" className="text-blue-400 hover:text-blue-300 underline font-semibold">Long</Link> Numbers</li>
                <li>• If you want to verify multiple services, go to <Link to="/emptysimcard" className="text-blue-400 hover:text-blue-300 underline font-semibold">Empty SIM cards</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${isCountryDropdownOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
            
          {!hasSearched ? (
            /* SEARCH VIEW */
            <div className="p-6">
                <div className="relative z-10 mx-auto">
                  {/* Search Header */}
                  <div className="text-left mb-9">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                      Search & Configure
                    </h1>
                    <p className="text-slate-300 text-md">Find and configure your short number service</p>
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

                    {/* Number Type Toggle */}
                    <div className="flex flex-col items-center space-y-3">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider text-center">
                        Number type
                      </label>
                      <div className="flex items-center bg-slate-700/50 rounded-full p-2 border border-slate-600/50">
                        <button
                          onClick={() => setNumberType('single')}
                          className={`px-4 sm:px-6 lg:px-8 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap min-h-[2.5rem] flex items-center ${
                            numberType === 'single'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg' 
                              : 'text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          Single Use
                        </button>
                        <button
                          onClick={() => setNumberType('reusable')}
                          className={`px-4 sm:px-6 lg:px-8 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap min-h-[2.5rem] flex items-center ${
                            numberType === 'reusable'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg' 
                              : 'text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          Reusable
                        </button>
                        <button
                          onClick={() => setNumberType('receive-send')}
                          className={`px-4 sm:px-6 lg:px-8 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap min-h-[2.5rem] flex items-center ${
                            numberType === 'receive-send'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg' 
                              : 'text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          Receive/Send
                        </button>
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
          ) : (
            /* RESULTS VIEW */
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
                    <div className="grid gap-6 grid-cols-1">
                      {searchResults.map((option) => (
                        <div
                          key={option.id}
                          className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 border-blue-500/50 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:scale-[1.01]" style={{ boxShadow: '0 0 24px rgba(59, 130, 246, 0.25)' }}
                        >
                          {/* Number Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-9 h-9 bg-blue-300/10 rounded-xl flex items-center justify-center">
                                <span className="text-emerald-400 font-bold text-sm">
                                  {searchResults.length === 1 ? '1st' : 
                                   searchResults.indexOf(option) === 0 ? '1st' :
                                   searchResults.indexOf(option) === 1 ? '2nd' : '3rd'}
                                </span>
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
                                {option.isReusable && option.extraSmsPrice && (
                                  <div className="flex items-center justify-between text-md">
                                    <span className="text-slate-300 font-medium">Each reuse:</span>
                                    <span className="text-emerald-400 font-semibold">
                                      ${option.extraSmsPrice.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {option.receiveSend ? (
                                  <div className="flex items-center justify-between text-md">
                                    <span className="text-slate-300 font-medium">Receive/Send:</span>
                                    <span className="font-semibold text-emerald-400">
                                      Yes
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between text-md">
                                    <span className="text-slate-300 font-medium">Reusable:</span>
                                    <span className={`font-semibold ${option.isReusable ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {option.isReusable ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                )}
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

                            {option.isReusable && option.extraSmsPrice && (
                              <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                                <span className="text-slate-300 font-medium">Each reuse:</span>
                                <span className="text-emerald-400 font-semibold">
                                  ${option.extraSmsPrice.toFixed(2)}
                                </span>
                              </div>
                            )}

                            {option.receiveSend ? (
                              <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                                <span className="text-slate-300 font-medium">Receive/Send:</span>
                                <span className="font-semibold text-emerald-400">
                                  Yes
                                </span>
                              </div>
                            ) : (
                              <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                                <span className="text-slate-300 font-medium">Reusable:</span>
                                <span className={`font-semibold ${option.isReusable ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {option.isReusable ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}

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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ShortNumbers;