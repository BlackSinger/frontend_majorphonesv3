import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

interface CardOption {
  id: string;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardFunds: number;
  price: number;
  hasBalance: boolean;
}

const Proxies: React.FC = () => {
  const navigate = useNavigate();
  const [hasBalance, setHasBalance] = useState(false);
  const [searchResults, setSearchResults] = useState<CardOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedState, setSelectedState] = useState('Any State');
  const [selectedDuration, setSelectedDuration] = useState('1 hour');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const durationDropdownRef = useRef<HTMLDivElement>(null);

  const usaStates = [
    { code: 'NA', name: 'Any State' },
    { code: 'AL', name: 'Alabama (AL)' },
    { code: 'AK', name: 'Alaska (AK)' },
    { code: 'AZ', name: 'Arizona (AZ)' },
    { code: 'AR', name: 'Arkansas (AR)' },
    { code: 'CA', name: 'California (CA)' },
    { code: 'CO', name: 'Colorado (CO)' },
    { code: 'CT', name: 'Connecticut (CT)' },
    { code: 'DE', name: 'Delaware (DE)' },
    { code: 'FL', name: 'Florida (FL)' },
    { code: 'GA', name: 'Georgia (GA)' },
    { code: 'HI', name: 'Hawaii (HI)' },
    { code: 'ID', name: 'Idaho (ID)' },
    { code: 'IL', name: 'Illinois (IL)' },
    { code: 'IN', name: 'Indiana (IN)' },
    { code: 'IA', name: 'Iowa (IA)' },
    { code: 'KS', name: 'Kansas (KS)' },
    { code: 'KY', name: 'Kentucky (KY)' },
    { code: 'LA', name: 'Louisiana (LA)' },
    { code: 'ME', name: 'Maine (ME)' },
    { code: 'MD', name: 'Maryland (MD)' },
    { code: 'MA', name: 'Massachusetts (MA)' },
    { code: 'MI', name: 'Michigan (MI)' },
    { code: 'MN', name: 'Minnesota (MN)' },
    { code: 'MS', name: 'Mississippi (MS)' },
    { code: 'MO', name: 'Missouri (MO)' },
    { code: 'MT', name: 'Montana (MT)' },
    { code: 'NE', name: 'Nebraska (NE)' },
    { code: 'NV', name: 'Nevada (NV)' },
    { code: 'NH', name: 'New Hampshire (NH)' },
    { code: 'NJ', name: 'New Jersey (NJ)' },
    { code: 'NM', name: 'New Mexico (NM)' },
    { code: 'NY', name: 'New York (NY)' },
    { code: 'NC', name: 'North Carolina (NC)' },
    { code: 'ND', name: 'North Dakota (ND)' },
    { code: 'OH', name: 'Ohio (OH)' },
    { code: 'OK', name: 'Oklahoma (OK)' },
    { code: 'OR', name: 'Oregon (OR)' },
    { code: 'PA', name: 'Pennsylvania (PA)' },
    { code: 'RI', name: 'Rhode Island (RI)' },
    { code: 'SC', name: 'South Carolina (SC)' },
    { code: 'SD', name: 'South Dakota (SD)' },
    { code: 'TN', name: 'Tennessee (TN)' },
    { code: 'TX', name: 'Texas (TX)' },
    { code: 'UT', name: 'Utah (UT)' },
    { code: 'VT', name: 'Vermont (VT)' },
    { code: 'VA', name: 'Virginia (VA)' },
    { code: 'WA', name: 'Washington (WA)' },
    { code: 'WV', name: 'West Virginia (WV)' },
    { code: 'WI', name: 'Wisconsin (WI)' },
    { code: 'WY', name: 'Wyoming (WY)' }
  ];

  const durations = [
    { value: '1hour', name: '1 hour' },
    { value: '1day', name: '1 day' },
    { value: '7days', name: '7 days' },
    { value: '30days', name: '30 days' }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
      }
      if (durationDropdownRef.current && !durationDropdownRef.current.contains(event.target as Node)) {
        setIsDurationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(false);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data for virtual card
      const mockResults: CardOption[] = [
        {
          id: '1',
          cardNumber: '4532 1234 5678 9012',
          expirationDate: '12/27',
          cvv: '123',
          cardFunds: hasBalance ? 3 : 0,
          price: hasBalance ? 7 : 4.5,
          hasBalance: hasBalance
        }
      ];

      setSearchResults(mockResults);
    } catch (error) {
      console.error('Error searching cards:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  return (
    <DashboardLayout currentPath="/proxies">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Proxies
                </h1>
                <p className="text-slate-300 text-md text-left">High-performance USA proxies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-blue-300 text-sm font-semibold mb-3">Important information about these proxies:</p>
              <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                <li>• They can't be refunded once purchased</li>
                <li>• They are real mobile IPs from AT&T and Verizon carriers</li>
                <li>• They are HTTPS/SOCKS5</li>
                <li>• They require user and password for authentication</li>     
              </ul>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <>
            {/* Main Content Section */}
            <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${isStateDropdownOpen || isDurationDropdownOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
              <div className="p-6">
                <div className="relative z-10 mx-auto">
                  {/* Search Header */}
                  <div className="text-left mb-9">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                      Search & Configure
                    </h1>
                    <p className="text-slate-300 text-md">Find and configure your proxy service</p>
                  </div>
                  
                  {/* Search Form */}
                  <div className="space-y-9">
                    {/* Form Elements Container */}
                    <div className="space-y-6">
                      {/* USA State and Duration Selectors Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* USA State Selection */}
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                            Select USA State
                          </label>
                          <div className="relative group" ref={stateDropdownRef}>
                            <div
                              onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                              className="w-full pl-4 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                            >
                              <span>{selectedState}</span>
                            </div>

                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isStateDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>

                            {/* Custom Dropdown Options */}
                            {isStateDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                {usaStates.map((state) => (
                                  <div
                                    key={state.code}
                                    onClick={() => {
                                      setSelectedState(state.name);
                                      setIsStateDropdownOpen(false);
                                    }}
                                    className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                  >
                                    <span className="text-white">{state.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Duration Selection */}
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                            Select Duration
                          </label>
                          <div className="relative group" ref={durationDropdownRef}>
                            <div
                              onClick={() => setIsDurationDropdownOpen(!isDurationDropdownOpen)}
                              className="w-full pl-4 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                            >
                              <span>{selectedDuration}</span>
                            </div>

                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isDurationDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>

                            {/* Custom Dropdown Options */}
                            {isDurationDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                {durations.map((duration) => (
                                  <div
                                    key={duration.value}
                                    onClick={() => {
                                      setSelectedDuration(duration.name);
                                      setIsDurationDropdownOpen(false);
                                    }}
                                    className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                  >
                                    <span className="text-white">{duration.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Search Button */}
                      <div className="flex flex-col items-center space-y-3">
                        <button
                          onClick={handleSearch}
                          disabled={isSearching}
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
                                <span>Search proxies</span>
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
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
                        Back to search
                      </span>
                    </button>
                  </div>

                  {/* Results Header */}
                  <div className="text-left mb-7">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                      Card options
                    </h1>
                    <p className="text-slate-300 text-md">
                      {searchResults.length > 0 
                        ? `Found 1 virtual debit card`
                        : 'No cards available'
                      }
                    </p>
                  </div>

                  {/* Results Grid */}
                  {searchResults.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1">
                      {searchResults.map((option) => (
                        <div
                          key={option.id}
                          className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 backdrop-blur-sm rounded-2xl p-8 border border-slate-600/50 border-blue-500/50 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:scale-[1.01]"
                          style={{ boxShadow: 'rgba(59, 130, 246, 0.25) 0px 0px 24px;' }}
                        >
                          {/* Card and Details Layout */}
                          <div className="flex flex-col space-y-6">
                            {/* Top Section: Card and Details */}
                            <div className="flex flex-col md:flex-row md:space-x-6">
                              {/* Virtual Card Display - Left Side on Desktop */}
                              <div className="flex-1 md:max-w-lg">
                                {/* Virtual Card Display */}
                                <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl border border-slate-600/50">
                                  {/* Card Background Pattern */}
                                  <div className="absolute inset-0 opacity-5">
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
                                    <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5"></div>
                                    <div className="absolute bottom-8 left-8 w-8 h-8 rounded-full bg-white/5"></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/3"></div>
                                  </div>
                                  
                                  <div className="relative z-10">
                                    {/* Card Header */}
                                    <div className="flex justify-center md:justify-between items-center mb-6">
                                      <div className="text-center md:text-left">
                                        <p className="text-md opacity-80 font-medium">Virtual Debit Card</p>
                                      </div>
                                      <img 
                                        src={MajorPhonesFavIc} 
                                        alt="MajorPhones" 
                                        className="w-12 h-10 object-contain hidden md:block"
                                      />
                                    </div>
                                    
                                    {/* Card Number */}
                                    <div className="mb-6">
                                      <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Card Number</p>
                                      <p className="text-md font-mono font-light">**** **** **** ****</p>
                                    </div>
                                    
                                    {/* Card Details Row */}
                                    <div className="grid grid-cols-2 gap-6">
                                      <div>
                                        <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Expires</p>
                                        <p className="text-md font-mono font-light">**/**</p>
                                      </div>
                                      <div>
                                        <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">CVV</p>
                                        <p className="text-md font-mono font-light">***</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Details - Right Side on Desktop */}
                              <div className="flex flex-col justify-center mt-6 md:mt-0 md:flex-1">
                                {/* Card Information Panel */}
                                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/40">
                                  <h3 className="text-md font-semibold text-white mb-4 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-blue-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Card Details
                                  </h3>
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                                      <span className="text-slate-300 font-medium">Type:</span>
                                      <span className={`font-semibold px-3 py-1 rounded-full text-xs md:text-sm ${
                                        option.hasBalance 
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                      }`}>
                                        {option.hasBalance ? 'With Balance' : 'No Balance'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                                      <span className="text-slate-300 font-medium">Card Funds:</span>
                                      <span className="text-emerald-400 font-bold text-md">
                                        ${option.cardFunds}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                      <span className="text-slate-300 font-medium">Price:</span>
                                      <span className="text-emerald-400 font-bold text-md">
                                        ${option.price}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Centered Purchase Button */}
                            <div className="flex justify-center">
                              <button 
                                onClick={() => navigate('/history?tab=proxies')}
                                className="group relative px-8 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] text-md overflow-hidden max-w-xs"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-500 hover:to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10 flex items-center justify-center">
                                  Purchase
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 max-w-md mx-auto">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-2xl mb-6">
                        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h4 className="text-2xl font-bold text-slate-300 mb-3">No Cards Available</h4>
                      <p className="text-slate-400 text-lg">Please try again later.</p>
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

export default Proxies;