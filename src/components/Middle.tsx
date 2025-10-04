import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { getAuth } from 'firebase/auth';

// Global object to store service name
const globalSearchData = {
  name: ''
};

// Global object to store purchase data
const globalPurchaseData = {
  serviceId: '',
  duration: 0
};

interface NumberOption {
  id: string;
  number: string;
  priceOneDay: number;
  priceSevenDays: number;
  priceFourteenDays: number;
  country: string;
  countryCode: string;
  countryPrefix: string;
  duration: number;
}

interface ServiceOption {
  id: string;
  name: string;
}

const Middle: React.FC = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [searchResults, setSearchResults] = useState<NumberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Services state
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [filteredServices, setFilteredServices] = useState<ServiceOption[]>([]);

  // Error handling state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  // Purchase state - track which option is being purchased
  const [purchasingOptionId, setPurchasingOptionId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to safely format price
  const formatPrice = (price: any): string => {
    // Convert to number and take only first 2 decimals
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

  // Load services from Firebase
  const loadServices = async () => {
    try {
      setIsLoadingServices(true);
      setHasError(false);
      // Clear previous services and search state
      setServices([]);
      setFilteredServices([]);
      setSelectedService(null);
      setSearchTerm('');
      setIsServiceDropdownOpen(false);

      const servicesRef = collection(db, 'middleTargetsUSA');
      const querySnapshot = await getDocs(servicesRef);

      const servicesList: ServiceOption[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        servicesList.push({
          id: doc.id,
          name: data.name || doc.id // Use name field or document ID as fallback
        });
      });

      // Sort services alphabetically
      servicesList.sort((a, b) => a.name.localeCompare(b.name));

      setServices(servicesList);
      setFilteredServices(servicesList);
      setHasError(false);
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
      setFilteredServices([]);
      setHasError(true);

      // Determine error message based on error type
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

  // Load services on component mount
  useEffect(() => {
    loadServices();
  }, []);

  // Handle error modal close
  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  // Handle service search filtering
  const handleServiceSearch = (value: string) => {
    setSearchTerm(value);

    if (!value.trim()) {
      setFilteredServices(services);
      setIsServiceDropdownOpen(false);
      return;
    }

    // Filter services based on search term
    const filtered = services.filter(service =>
      service.name.toLowerCase().includes(value.toLowerCase())
    );

    // If no matches found, show "Service not listed" option
    if (filtered.length === 0) {
      setFilteredServices([{ id: 'allservices', name: 'Service not listed' }]);
    } else {
      setFilteredServices(filtered);
    }

    setIsServiceDropdownOpen(true);
  };

  // Handle service selection
  const handleServiceSelect = (service: ServiceOption) => {
    setSelectedService(service);
    setSearchTerm(service.name);
    setIsServiceDropdownOpen(false);
  };

  // Handle service input focus
  const handleServiceInputFocus = () => {
    if (!isLoadingServices && !isSearching && services.length > 0) {
      setFilteredServices(services);
      setIsServiceDropdownOpen(true);
    }
  };

  // Close dropdown when clicking outside
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

    // Create unique identifier for this option
    const uniqueOptionId = `${option.duration}days-${option.id}`;
    setPurchasingOptionId(uniqueOptionId);

    try {
      // Get the service data from Firebase to fill globalPurchaseData
      const servicesRef = collection(db, 'middleUSA', 'opt4', 'services');
      const querySnapshot = await getDocs(servicesRef);

      let serviceFound = false;
      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Check if this is the correct service
        if (data.name && data.name.toLowerCase() === globalSearchData.name.toLowerCase()) {
          // Fill the global purchase data object
          globalPurchaseData.serviceId = doc.id;
          globalPurchaseData.duration = option.duration;
          serviceFound = true;

          // Print the global purchase data object
          console.log(globalPurchaseData);
        }
      });

      if (!serviceFound) {
        setErrorMessage('Please refresh the page and try again');
        setShowErrorModal(true);
        setPurchasingOptionId(null);
        return;
      }

      // Get Firebase ID token
      const idToken = await currentUser.getIdToken();
      console.log(JSON.stringify(globalPurchaseData));
      // Make API call to buymiddleusa cloud function
      const response = await fetch('https://buymiddleusa-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(globalPurchaseData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success case - redirect to history
        navigate('/history');
      } else {
        // Handle error responses
        let errorMsg = 'An unknown error occurred';

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.message === 'Invalid serviceId' || data.message === 'Invalid duration') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'You cannot rent, because you have used Amazon Pay') {
          errorMsg = 'Users that deposit with Amazon Pay cannot purchase middle numbers';
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
      console.error('Buy Middle USA purchase error:', error);
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
  };

  const handleSearch = async () => {
    if (!selectedService) return;

    // Store service name in global object
    globalSearchData.name = selectedService.name;

    // Print to console for verification
    console.log('Selected service name:', globalSearchData.name);

    setIsSearching(true);
    setHasSearched(false);

    try {
      let allNumbers: NumberOption[] = [];

      // Search in middleUSA/opt4/services collection
      const servicesRef = collection(db, 'middleUSA', 'opt4', 'services');
      const querySnapshot = await getDocs(servicesRef);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let shouldInclude = false;

        // Check if this is the "Service not listed" case
        if (globalSearchData.name.toLowerCase() === 'service not listed') {
          // For "Service not listed", look for document ID "allservices"
          shouldInclude = doc.id === 'allservices';
        } else {
          // For other services, check if service name matches EXACTLY (case insensitive)
          shouldInclude = data.name && data.name.toLowerCase() === globalSearchData.name.toLowerCase();
        }

        if (shouldInclude) {
          const selectedCountryData = countries.find(c => c.name === selectedCountry);
          const countryCode = selectedCountryData?.code || 'US';
          const countryPrefix = selectedCountryData?.prefix || '+1';

          // For "allservices" document, only create 7 and 14 days options (no 1 day)
          if (doc.id === 'allservices') {
            if (data.priceSevenDays) {
              allNumbers.push({
                id: `7days-${doc.id}`,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                priceOneDay: 0,
                priceSevenDays: Number(data.priceSevenDays),
                priceFourteenDays: Number(data.priceFourteenDays || 0),
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                duration: 7
              });
            }

            if (data.priceFourteenDays) {
              allNumbers.push({
                id: `14days-${doc.id}`,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                priceOneDay: 0,
                priceSevenDays: Number(data.priceSevenDays || 0),
                priceFourteenDays: Number(data.priceFourteenDays),
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                duration: 14
              });
            }
          } else {
            // For other services, create all three options as before
            if (data.priceOneDay) {
              allNumbers.push({
                id: `1day-${doc.id}`,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                priceOneDay: Number(data.priceOneDay),
                priceSevenDays: Number(data.priceSevenDays || 0),
                priceFourteenDays: Number(data.priceFourteenDays || 0),
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                duration: 1
              });
            }

            if (data.priceSevenDays) {
              allNumbers.push({
                id: `7days-${doc.id}`,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                priceOneDay: Number(data.priceOneDay || 0),
                priceSevenDays: Number(data.priceSevenDays),
                priceFourteenDays: Number(data.priceFourteenDays || 0),
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                duration: 7
              });
            }

            if (data.priceFourteenDays) {
              allNumbers.push({
                id: `14days-${doc.id}`,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                priceOneDay: Number(data.priceOneDay || 0),
                priceSevenDays: Number(data.priceSevenDays || 0),
                priceFourteenDays: Number(data.priceFourteenDays),
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                duration: 14
              });
            }
          }
        }
      });

      // Only show results if we have them, otherwise stay in search view
      if (allNumbers.length > 0) {
        setSearchResults(allNumbers);
        setHasSearched(true);
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    } catch (error) {
      console.error('Error searching numbers:', error);

      // Reset search state to allow retry
      setSearchResults([]);
      setHasSearched(false);

      // Determine error message based on error type
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
    <DashboardLayout currentPath="/middle">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                    
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Middle Numbers
                </h1>
                <p className="text-slate-300 text-md text-left">Temporary numbers with extended duration</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-blue-300 text-sm font-semibold mb-3">Important information about these numbers:</p>
              <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                <li>• These numbers last 1, 7 or 14 days depending on the option specified</li>
                <li>• Their duration can't be extended</li>
                <li>• After purchased, some can be cancelled and some can't</li>
                <li>• Users that deposit through Amazon Pay can't purchase them</li>
                <li>• If you want to verify more than 1 service with the same number, go to <Link to="/emptysimcard" className="text-blue-400 hover:text-blue-300 underline font-semibold">Empty SIM cards</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${(isCountryDropdownOpen || isServiceDropdownOpen) ? 'overflow-visible' : 'overflow-hidden'}`}>
          
          {!hasSearched ? (
            /* SEARCH VIEW */
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
                <div className="space-y-4">
                  {/* Form Elements Container */}
                  <div className="space-y-6">
                    {/* Service Input and Country Selection Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Search Input */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                          Search Service
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
                            placeholder={isLoadingServices ? "Loading services..." : "Enter service name"}
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

                  {/* Search Button Row */}
                  <div className="flex flex-col items-center justify-center">
                    {/* Search Button */}
                    <div className="flex flex-col items-center space-y-3">
                      <div className="h-2"></div>
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
          ) : (
            /* RESULTS VIEW */
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
                            {/* Price, Duration, Renewable in two columns */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-md">
                                <span className="text-slate-300 font-medium">Price:</span>
                                <span className="text-emerald-400 font-semibold">
                                  ${formatPrice(
                                    option.duration === 1 ? option.priceOneDay :
                                    option.duration === 7 ? option.priceSevenDays :
                                    option.priceFourteenDays
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-md">
                                <span className="text-slate-300 font-medium">Duration:</span>
                                <span className="text-emerald-400 font-semibold">
                                  {option.duration} {option.duration === 1 ? 'day' : 'days'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-md">
                                <span className="text-slate-300 font-medium">Renewable:</span>
                                <span className="text-red-400 font-semibold">No</span>
                              </div>
                            </div>
                            {/* Purchase Button - full width */}
                            <button
                              onClick={() => handlePurchase(option)}
                              disabled={purchasingOptionId !== null}
                              //onClick={() => navigate('/history')}
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

                          {/* Desktop Layout */}
                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Price:</span>
                            <span className="text-emerald-400 font-semibold">
                              ${formatPrice(
                                option.duration === 1 ? option.priceOneDay :
                                option.duration === 7 ? option.priceSevenDays :
                                option.priceFourteenDays
                              )}
                            </span>
                          </div>

                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Duration:</span>
                            <span className="text-emerald-400 font-semibold">
                              {option.duration} {option.duration === 1 ? 'day' : 'days'}
                            </span>
                          </div>

                          <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                            <span className="text-slate-300 font-medium">Renewable:</span>
                            <span className="text-red-400 font-semibold">No</span>
                          </div>

                          <button
                            onClick={() => handlePurchase(option)}
                            disabled={purchasingOptionId !== null}
                            //onClick={() => navigate('/history')}
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
    </DashboardLayout>
  );
};

export default Middle;