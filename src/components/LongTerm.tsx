import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { getAuth } from 'firebase/auth';

const globalSearchData = {
  name: ''
};

const globalPurchaseData = {
  serviceId: '',
  duration: 0
};

interface NumberOption {
  id: string;
  number: string;
  priceThirtyDays: number;
  priceYear: number;
  country: string;
  countryCode: string;
  countryPrefix: string;
  duration: number;
}

interface ServiceOption {
  id: string;
  name: string;
}

const LongTerm: React.FC = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [searchResults, setSearchResults] = useState<NumberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [filteredServices, setFilteredServices] = useState<ServiceOption[]>([]);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  const [purchasingOptionId, setPurchasingOptionId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  const formatPrice = (price: any): string => {
    const numPrice = parseFloat(Number(price).toFixed(2));
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  const countries = [
    {
      code: 'US',
      name: 'United States',
      prefix: '+1',
      flag: (
        <svg className="w-5 h-4 inline-block mr-2" viewBox="0 0 60 40">
          <rect width="60" height="40" fill="#B22234" />
          <rect width="60" height="3" y="3" fill="white" />
          <rect width="60" height="3" y="9" fill="white" />
          <rect width="60" height="3" y="15" fill="white" />
          <rect width="60" height="3" y="21" fill="white" />
          <rect width="60" height="3" y="27" fill="white" />
          <rect width="60" height="3" y="33" fill="white" />
          <rect width="24" height="21" fill="#3C3B6E" />
        </svg>
      )
    }
  ];

  const loadServices = async () => {
    try {
      setIsLoadingServices(true);
      setHasError(false);
      setServices([]);
      setFilteredServices([]);
      setSelectedService(null);
      setSearchTerm('');
      setIsServiceDropdownOpen(false);

      const servicesRef = collection(db, 'longTargetsUSA');
      const querySnapshot = await getDocs(servicesRef);

      const servicesList: ServiceOption[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        servicesList.push({
          id: doc.id,
          name: data.name || doc.id
        });
      });

      servicesList.sort((a, b) => a.name.localeCompare(b.name));

      setServices(servicesList);
      setFilteredServices(servicesList);
      setHasError(false);
    } catch (error) {
      setServices([]);
      setFilteredServices([]);
      setHasError(true);

      let userErrorMessage = 'An error occurred while loading services, please contact support';

      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          userErrorMessage = 'You do not have permission to access the services';
        } else if (error.message.includes('unavailable')) {
          userErrorMessage = 'Services are temporarily unavailable, please try again later';
        } else if (error.message.includes('network')) {
          userErrorMessage = 'Network connection error, please check your internet connection';
        } else if (error.message.includes('not-found')) {
          userErrorMessage = 'Services not found, please contact customer support';
        }
      }

      setErrorMessage(userErrorMessage);
      setShowErrorModal(true);
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  const handleServiceSearch = (value: string) => {
    setSearchTerm(value);

    if (!value.trim()) {
      setFilteredServices(services);
      setIsServiceDropdownOpen(false);
      return;
    }

    const filtered = services.filter(service =>
      service.name.toLowerCase().includes(value.toLowerCase())
    );

    if (filtered.length === 0) {
      setFilteredServices([{ id: 'allservices', name: 'Service not listed' }]);
    } else {
      setFilteredServices(filtered);
    }

    setIsServiceDropdownOpen(true);
  };

  const handleServiceSelect = (service: ServiceOption) => {
    setSelectedService(service);
    setSearchTerm(service.name);
    setIsServiceDropdownOpen(false);
  };

  const handleServiceInputFocus = () => {
    if (!isLoadingServices && !isSearching && services.length > 0) {
      setFilteredServices(services);
      setIsServiceDropdownOpen(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePurchase = async (option: NumberOption) => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    const uniqueOptionId = `${option.duration}days-${option.id}`;
    setPurchasingOptionId(uniqueOptionId);

    try {
      const servicesRef = collection(db, 'longUSA', 'opt4', 'services');
      const querySnapshot = await getDocs(servicesRef);

      let serviceFound = false;
      querySnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.name && data.name.toLowerCase() === globalSearchData.name.toLowerCase()) {
          globalPurchaseData.serviceId = doc.id;
          globalPurchaseData.duration = option.duration;
          serviceFound = true;

        }
      });

      if (!serviceFound) {
        setErrorMessage('Please refresh the page and try again');
        setShowErrorModal(true);
        setPurchasingOptionId(null);
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch('https://buylongusa-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(globalPurchaseData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigate('/history');
      } else {
        let errorMsg = 'An unknown error occurred';

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.message === 'Invalid serviceId' || data.message === 'Invalid duration') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'You cannot rent, because you have used Amazon Pay') {
          errorMsg = 'Users that deposit with Amazon Pay cannot purchase long numbers';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Internal Server Error') {
          errorMsg = 'Please contact our customer support';
        } else if (data.message === 'Service unavailable') {
          errorMsg = 'We ran out of SIM cards, try again later';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
  };

  const handleSearch = async () => {
    if (!selectedService) return;

    globalSearchData.name = selectedService.name;

    setIsSearching(true);
    setHasSearched(false);

    try {
      let allNumbers: NumberOption[] = [];

      const servicesRef = collection(db, 'longUSA', 'opt4', 'services');
      const querySnapshot = await getDocs(servicesRef);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let shouldInclude = false;

        if (globalSearchData.name.toLowerCase() === 'service not listed') {
          shouldInclude = doc.id === 'allservices';
        } else {
          shouldInclude = data.name && data.name.toLowerCase() === globalSearchData.name.toLowerCase();
        }

        if (shouldInclude) {
          const selectedCountryData = countries.find(c => c.name === selectedCountry);
          const countryCode = selectedCountryData?.code || 'US';
          const countryPrefix = selectedCountryData?.prefix || '+1';

          if (data.priceThirtyDays) {
            allNumbers.push({
              id: `30days-${doc.id}`,
              number: `${countryPrefix}-XXXXXX`,
              priceThirtyDays: Number(data.priceThirtyDays),
              priceYear: Number(data.priceYear || 0),
              country: selectedCountry,
              countryCode: countryCode,
              countryPrefix: countryPrefix,
              duration: 30
            });
          }

          if (data.priceYear) {
            allNumbers.push({
              id: `365days-${doc.id}`,
              number: `${countryPrefix}-XXXXXX`,
              priceThirtyDays: Number(data.priceThirtyDays || 0),
              priceYear: Number(data.priceYear),
              country: selectedCountry,
              countryCode: countryCode,
              countryPrefix: countryPrefix,
              duration: 365
            });
          }
        }
      });

      if (allNumbers.length > 0) {
        setSearchResults(allNumbers);
        setHasSearched(true);
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    } catch (error) {

      setSearchResults([]);
      setHasSearched(false);

      let userErrorMessage = 'An error occurred while searching for numbers, please try again';

      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          userErrorMessage = 'You do not have permission to access the number search';
        } else if (error.message.includes('unavailable')) {
          userErrorMessage = 'Number search is temporarily unavailable, please try again later';
        } else if (error.message.includes('network')) {
          userErrorMessage = 'Network connection error, please check your internet connection';
        } else if (error.message.includes('not-found')) {
          userErrorMessage = 'Number options not found, please contact customer support';
        } else if (error.message.includes('quota-exceeded')) {
          userErrorMessage = 'Service quota exceeded, please try again later';
        }
      }

      setErrorMessage(userErrorMessage);
      setShowErrorModal(true);
    } finally {
      setIsSearching(false);
    }
  };

  return (
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
                  <li>• They are valid for 30 or 365 days</li>
                  <li>• After purchased, some can be cancelled and some can't</li>
                  <li>• Users that deposit through Amazon Pay can't purchase them</li>
                  <li>• If you want to verify more than 1 service with the same number, go to <Link to="/emptysimcard" className="text-blue-400 hover:text-blue-300 underline font-semibold">Empty SIM cards</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content Section */}
          <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${(isCountryDropdownOpen || isServiceDropdownOpen) ? 'overflow-visible' : 'overflow-hidden'}`}>
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
                    <div className="grid grid-cols-1 gap-6">
                      {/* Search Input */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                          Which service do you want to receive an SMS from?
                        </label>
                        <div className="relative group" ref={serviceDropdownRef}>
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <svg className="h-6 w-6 text-emerald-400 group-focus-within:text-emerald-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleServiceSearch(e.target.value)}
                            onFocus={handleServiceInputFocus}
                            disabled={isLoadingServices || hasError || isSearching}
                            className="w-full pl-14 pr-3 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={isLoadingServices ? "Loading services..." : "Gmail, Facebook, eBay..."}
                          />

                          {/* Service Dropdown */}
                          {isServiceDropdownOpen && !isLoadingServices && !hasError && !isSearching && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                              {filteredServices.map((service) => (
                                <div
                                  key={service.id}
                                  onClick={() => handleServiceSelect(service)}
                                  className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                >
                                  <span className="text-white">{service.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
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
                      disabled={!selectedService || isSearching || isLoadingServices || hasError}
                      className="group px-5 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[200px]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="relative z-10 flex items-center justify-center">
                        {isSearching || isLoadingServices ? (
                          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <>
                            <span className="group-hover:tracking-wide transition-all duration-300">
                              <span>
                                {isLoadingServices ? 'Loading...' : 'Search numbers'}
                              </span>
                            </span>
                          </>
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
                  <li>• They are valid for 30 or 365 days</li>
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
                    onClick={() => window.location.reload()}
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
                                {searchResults.indexOf(option) === 0 ? '1st' :
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
                                  ${formatPrice(
                                    option.duration === 30 ? option.priceThirtyDays :
                                      option.priceYear
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-md">
                                <span className="text-slate-300 font-medium">Duration:</span>
                                <span className="text-emerald-400 font-semibold">
                                  {option.duration} days
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-md">
                                <span className="text-slate-300 font-medium">Renewable:</span>
                                <span className="text-emerald-400 font-semibold">Yes</span>
                              </div>
                            </div>
                            {/* Purchase Button - full width */}
                            <button
                              onClick={() => handlePurchase(option)}
                              disabled={purchasingOptionId !== null}
                              className="w-full px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] text-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              {purchasingOptionId === `${option.duration}days-${option.id}` ? (
                                <div className="flex items-center justify-center">
                                  <svg className="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </div>
                              ) : (
                                'Purchase'
                              )}
                            </button>
                          </div>

                          {/* Desktop Layout - unchanged */}
                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Price:</span>
                            <span className="text-emerald-400 font-semibold">
                              ${formatPrice(
                                option.duration === 30 ? option.priceThirtyDays :
                                  option.priceYear
                              )}
                            </span>
                          </div>

                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Duration:</span>
                            <span className="text-emerald-400 font-semibold">
                              {option.duration} days
                            </span>
                          </div>

                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Renewable:</span>
                            <span className="text-emerald-400 font-semibold">Yes</span>
                          </div>

                          <button
                            onClick={() => handlePurchase(option)}
                            disabled={purchasingOptionId !== null}
                            className="hidden md:block px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[120px]"
                          >
                            {purchasingOptionId === `${option.duration}days-${option.id}` ? (
                              <div className="flex items-center justify-center">
                                <svg className="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </div>
                            ) : (
                              'Purchase'
                            )}
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
                onClick={handleErrorModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LongTerm;