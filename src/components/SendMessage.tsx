import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const SendMessage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<NumberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const numbers = [
    { 
      code: 'US', 
      number: '+14157358371',
      service: 'Google',
      codeReceived: true,
      messageReceived: '123456',
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
    // Check if code has been received
    const selectedNumberData = numbers.find(n => n.number === selectedNumber);
    
    if (!selectedNumberData?.codeReceived) {
      setShowErrorModal(true);
      return;
    }

    setIsSearching(true);
    setHasSearched(false);

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const countryCode = selectedNumberData?.code || 'US';
      
      // Mock data for empty simcard numbers
      const mockResults: NumberOption[] = [
        {
          id: '1',
          number: '555-0123',
          price: 25.00,
          country: 'United States',
          countryCode: countryCode,
          countryPrefix: '+1',
          duration: 30,
          successRate: 99
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
    <DashboardLayout currentPath="/sendmessage">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Send message
                </h1>
                <p className="text-slate-300 text-md text-left">Reply multiple times to short numbers</p>
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
                <li>• They can send SMS only to the number selected</li>
                <li>• They can send SMS only if a code has arrived</li>
                <li>• They can send multiple SMS in 5 minutes</li>
                <li>• Their duration can't be extended</li>
                <li>• They can't be cancelled</li>
                <li>• Sent SMS can't be edited or cancelled</li>
                <li>• SMS can't contain images, videos, etc, only text</li>
              </ul>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <>
            {/* Main Content Section */}
          <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${isCountryDropdownOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="p-6">
              <div className="relative z-10 mx-auto">
                {/* Search Header */}
                <div className="text-left mb-9">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                    Search For Numbers
                  </h1>
                  <p className="text-slate-300 text-md">Find the number to send SMS to</p>
                </div>
                
                {/* Search Form */}
                <div className="space-y-9">
                  {/* Form Elements Container */}
                  <div className="space-y-6">
                    {/* Country Selection and Search Button Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                      {/* Country Selection */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider text-center">
                          Select Number
                        </label>
                        <div className="relative group" ref={dropdownRef}>
                          <div
                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            className="w-full pl-12 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <div className="absolute left-4">
                                {numbers[0]?.flag}
                              </div>
                              <span className={selectedNumber ? '' : 'text-slate-400'}>
                                {selectedNumber || 'Choose'}
                              </span>
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
                              {numbers.map((numberOption) => (
                                <div
                                  key={numberOption.code}
                                  onClick={() => {
                                    setSelectedNumber(numberOption.number);
                                    setIsCountryDropdownOpen(false);
                                  }}
                                  className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                >
                                  <div className="mr-1">
                                    {numberOption.flag}
                                  </div>
                                  <span className="text-white">{numberOption.number}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Search Button */}
                      <div className="space-y-3 flex flex-col justify-end">
                        <div className="hidden md:block text-sm font-semibold text-transparent uppercase tracking-wider">
                          Search
                        </div>
                        <button 
                          onClick={handleSearch}
                          disabled={isSearching || !selectedNumber}
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
                                <span>Send SMS</span>
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
                      Back to Search
                    </span>
                  </button>
                </div>

                {/* Results Header */}
                <div className="text-left mb-7">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    Send SMS
                  </h1>
                  <p className="text-slate-300 text-md">
                    {searchResults.length > 0 
                      ? (
                          <span>
                            To number {selectedNumber} for {numbers.find(n => n.number === selectedNumber)?.service}
                          </span>
                        )
                      : (
                          <span>
                            No numbers found for {selectedNumber}
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
                        {/* Chat Interface */}
                        <div className="flex flex-col h-96">
                          {/* Received Message */}
                          <div className="flex justify-start mb-4">
                            <div className="bg-slate-700/50 rounded-lg px-4 py-2 max-w-xs">
                              <p className="text-white text-sm">{numbers.find(n => n.number === selectedNumber)?.messageReceived}</p>
                            </div>
                          </div>

                          {/* Messages Area */}
                          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                            {/* Sent messages will appear here */}
                          </div>

                          {/* Input Area */}
                          <div className="flex space-x-3">
                            <textarea
                              placeholder="Type your message..."
                              className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 resize-none h-20 overflow-y-auto"
                              rows={3}
                            />
                            <button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 h-20 flex items-center justify-center">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                              </svg>
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

        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Error</h3>
                <p className="text-blue-200 mb-4">You haven't received a code yet, nothing to reply</p>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SendMessage;