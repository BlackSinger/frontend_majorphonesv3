import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAuth } from 'firebase/auth';

interface ProxyOption {
  id: string;
  state: string;
  duration: string;
  price: number;
}

const Proxies: React.FC = () => {
  const navigate = useNavigate();
  const [hasBalance, setHasBalance] = useState(false);
  const [searchResults, setSearchResults] = useState<ProxyOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('1 hour');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const [stateSearchTerm, setStateSearchTerm] = useState('');
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const durationDropdownRef = useRef<HTMLDivElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);

  const [proxySelection, setProxySelection] = useState({
    duration: 0,
    state: ''
  });

  const [proxyPrices, setProxyPrices] = useState({
    hour: 1,
    day: 2,
    week: 5,
    month: 20
  });

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchaseDisabled, setIsPurchaseDisabled] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const usaStates = [
    { code: 'NA', name: 'Random State' }
  ];

  const durations = [
    { value: '1hour', name: '1 hour' },
    { value: '1day', name: '1 day' },
    { value: '7days', name: '7 days' },
    { value: '30days', name: '30 days' }
  ];

  const filteredStates = usaStates.filter(state =>
    state.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
  );

  useEffect(() => {
    const fetchProxyPrices = async () => {
      try {
        const proxyDocRef = doc(db, 'fees', 'proxyCatalog');
        const proxyDocSnap = await getDoc(proxyDocRef);

        if (proxyDocSnap.exists()) {
          const data = proxyDocSnap.data();
          setProxyPrices({
            hour: data.hour || 5,
            day: data.day || 12,
            week: data.week || 35,
            month: data.month || 120
          });
        }
      } catch (error) {
      }
    };

    fetchProxyPrices();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
        if (!selectedState) {
          setStateSearchTerm('');
        } else {
          setStateSearchTerm('');
        }
      }
      if (durationDropdownRef.current && !durationDropdownRef.current.contains(event.target as Node)) {
        setIsDurationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedState]);

  const handleStateSelect = (stateName: string) => {
    setSelectedState(stateName);
    setIsStateDropdownOpen(false);
    setStateSearchTerm('');
  };

  const handleStateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStateSearchTerm(value);

    if (value === '') {
      setSelectedState('');
    }

    if (!isStateDropdownOpen) {
      setIsStateDropdownOpen(true);
    }
  };

  const handleStateInputClick = () => {
    setIsStateDropdownOpen(true);
    if (stateInputRef.current) {
      stateInputRef.current.focus();
    }
  };

  const getProxyPrice = (duration: string): number => {
    const priceMap: { [key: string]: number } = {
      '1 hour': proxyPrices.hour,
      '1 day': proxyPrices.day,
      '7 days': proxyPrices.week,
      '30 days': proxyPrices.month
    };
    return priceMap[duration] || proxyPrices.hour;
  };

  const getStateName = (fullStateName: string) => {
    if (fullStateName.includes('(')) {
      return fullStateName.split(' (')[0];
    }
    return fullStateName;
  };

  const getDurationNumber = (duration: string): number => {
    const durationMap: { [key: string]: number } = {
      '1 hour': 0,
      '1 day': 1,
      '7 days': 7,
      '30 days': 30
    };
    return durationMap[duration] || 0;
  };

  const getStateCode = (stateName: string): string => {
    const state = usaStates.find(s => s.name === stateName);
    return state ? state.code : 'NA';
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(false);

    const stateCode = getStateCode(selectedState);
    const durationNum = getDurationNumber(selectedDuration);

    setProxySelection({
      duration: durationNum,
      state: stateCode
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockResults: ProxyOption[] = [
        {
          id: '1',
          state: selectedState,
          duration: selectedDuration,
          price: getProxyPrice(selectedDuration)
        }
      ];

      setSearchResults(mockResults);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handlePurchase = async () => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    setIsPurchasing(true);
    setIsPurchaseDisabled(true);

    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch('https://buymobileproxyusa-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proxySelection)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigate('/history?tab=proxies');
      } else {
        let errorMsg = 'An unknown error occurred';
        let shouldKeepDisabled = false;

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
          shouldKeepDisabled = true;
        } else if (data.message === 'You cannot buy a proxy, because you have used Amazon Pay') {
          errorMsg = 'Users that deposit with Amazon Pay cannot purchase proxies';
          shouldKeepDisabled = true;
        } else if (data.message === 'duration is required') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'state is required') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Invalid duration') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Invalid price') {
          errorMsg = 'When tyring to purchase this proxy, please contact our customer support';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Error generating token') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Invalid state') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Error purchasing proxy') {
          errorMsg = 'We ran out of proxies, try again later';
        } else if (data.message === 'Internal Server Error') {
          errorMsg = 'Please contact our customer support';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        setIsPurchasing(false);

        if (!shouldKeepDisabled) {
          setIsPurchaseDisabled(false);
        }
      }
    } catch (error) {
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
      setIsPurchasing(false);
      setIsPurchaseDisabled(false);
    }
  };

  return (
    <>
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
                <li>• You can't select location, it is assigned randomly</li>     
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
                            <div className="relative">
                              <input
                                ref={stateInputRef}
                                type="text"
                                value={stateSearchTerm || selectedState || ''}
                                onChange={handleStateInputChange}
                                onClick={handleStateInputClick}
                                placeholder="Type or choose state"
                                disabled={isSearching}
                                className="w-full pl-4 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isStateDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>

                            {/* Custom Dropdown Options */}
                            {isStateDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                {filteredStates.length > 0 ? (
                                  filteredStates.map((state) => (
                                    <div
                                      key={state.code}
                                      onClick={() => handleStateSelect(state.name)}
                                      className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                    >
                                      <span className="text-white">{state.name}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-slate-400 text-center">
                                    No states found
                                  </div>
                                )}
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
                              onClick={() => !isSearching && setIsDurationDropdownOpen(!isDurationDropdownOpen)}
                              className={`w-full pl-4 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between ${isSearching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                          disabled={isSearching || !selectedState}
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
                      onClick={() => window.location.reload()}
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
                      Proxy options
                    </h1>
                    <p className="text-slate-300 text-md">
                      {searchResults.length > 0 
                        ? `Found 1 USA proxy`
                        : 'No proxies available'
                      }
                    </p>
                  </div>

                  {/* Results Grid */}
                  {searchResults.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1">
                      {searchResults.map((option) => (
                        <div
                          key={option.id}
                          className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 border-blue-500/50 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:scale-[1.01]"
                          style={{ boxShadow: 'rgba(59, 130, 246, 0.25) 0px 0px 24px' }}
                        >
                          {/* Proxy Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-9 h-9 bg-blue-300/10 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-white font-bold text-md">Proxy Details</p>
                              </div>
                            </div>
                          </div>

                          {/* Details in one line */}
                          <div className="md:flex md:items-center md:justify-between">
                            {/* Mobile Layout */}
                            <div className="md:hidden space-y-3">
                              {/* Price, Duration, USA State in columns */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-md">
                                  <span className="text-slate-300 font-medium">Price:</span>
                                  <span className="text-emerald-400 font-semibold">
                                    ${option.price}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-md">
                                  <span className="text-slate-300 font-medium">Duration:</span>
                                  <span className="text-emerald-400 font-semibold">
                                    {option.duration}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-md">
                                  <span className="text-slate-300 font-medium">State:</span>
                                  <span className="text-emerald-400 font-semibold">{getStateName(option.state)}</span>
                                </div>
                              </div>
                              {/* Purchase Button - full width */}
                              <button
                                onClick={handlePurchase}
                                disabled={isPurchasing || isPurchaseDisabled}
                                className="w-full px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] text-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                              >
                                {isPurchasing ? (
                                  <div className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  </div>
                                ) : (
                                  'Purchase'
                                )}
                              </button>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                              <span className="text-slate-300 font-medium">Price:</span>
                              <span className="text-emerald-400 font-semibold">
                                ${option.price}
                              </span>
                            </div>

                            <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                              <span className="text-slate-300 font-medium">Duration:</span>
                              <span className="text-emerald-400 font-semibold">
                                {option.duration}
                              </span>
                            </div>

                            <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                              <span className="text-slate-300 font-medium">State:</span>
                              <span className="text-emerald-400 font-semibold">{option.state}</span>
                            </div>

                            <button
                              onClick={handlePurchase}
                              disabled={isPurchasing || isPurchaseDisabled}
                              className="hidden md:flex md:items-center md:justify-center px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[120px]"
                            >
                              {isPurchasing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              ) : (
                                'Purchase'
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 max-w-md mx-auto">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-2xl mb-6">
                        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h4 className="text-2xl font-bold text-slate-300 mb-3">No Proxies Available</h4>
                      <p className="text-slate-400 text-lg">Please try again later.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Error</h3>
              <p className="text-blue-200 mb-4">{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Proxies;