import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';

const globalSearchData = {
  serviceName: '',
  variantId: ''
};

interface AccountVariant {
  id?: string | null;
  country?: string | null;
  creation_year?: number | string | null;
  email_included?: boolean | null;
  has_2fa?: boolean | null;
  price?: number | null;
}

interface ServiceOption {
  id: string;
  name: string;
}

const Marketplace: React.FC = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  const formatPrice = (price: any): string => {
    const numPrice = parseFloat(Number(price).toFixed(2));
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AccountVariant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [filteredServices, setFilteredServices] = useState<ServiceOption[]>([]);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  const [purchasingVariantId, setPurchasingVariantId] = useState<string | null>(null);

  const serviceDropdownRef = useRef<HTMLDivElement>(null);



  const loadServices = async () => {
    try {
      setIsLoadingServices(true);
      setHasError(false);
      setServices([]);
      setFilteredServices([]);
      setSelectedService(null);
      setSearchTerm('');
      setIsServiceDropdownOpen(false);

      const marketplaceRef = collection(db, 'marketplace');
      const marketplaceSnap = await getDocs(marketplaceRef);

      const finalServicesList: ServiceOption[] = marketplaceSnap.docs
        .map(d => ({ id: d.id, name: d.id }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setServices(finalServicesList);
      setFilteredServices(finalServicesList);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      setFilteredServices([]);
      setIsServiceDropdownOpen(false);
    } else {
      setFilteredServices(filtered);
      setIsServiceDropdownOpen(true);
    }
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

  const handlePurchaseClick = async (variant: AccountVariant) => {
    if (!user || !variant.id || purchasingVariantId) return;

    globalSearchData.variantId = variant.id;
    setPurchasingVariantId(variant.id);

    try {
      const idToken = await user.getIdToken();

      const response = await fetch('https://us-central1-majorphonesv3.cloudfunctions.net/buyMarketplaceAccount', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceName: globalSearchData.serviceName,
          variantId: globalSearchData.variantId
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success !== false) {
        console.log('buyMarketplaceAccount response:', data);
        navigate('/history');
        return;
      }

      console.log('buyMarketplaceAccount error:', data);

      const serverError = data?.message || data?.error || '';
      let userErrorMessage = 'An error occurred while processing your purchase, please try again';

      if (['Missing parameters in request body', 'Invalid variant price', 'Service not found', 'Invalid variant id'].includes(serverError)) {
        userErrorMessage = 'Please refresh the page and try again';
      } else if (serverError === 'Insufficient balance') {
        userErrorMessage = 'You do not have enough balance to make the purchase';
      } else if (serverError === 'Service unavailable') {
        userErrorMessage = 'We ran out of accounts for this option, try another one';
      } else if (serverError === 'Unauthorized') {
        userErrorMessage = 'You are not authenticated or your token is invalid';
      } else if (serverError === 'Internal Server Error') {
        userErrorMessage = 'Please contact our customer support';
      }

      setErrorMessage(userErrorMessage);
      setShowErrorModal(true);
    } catch (error) {
      console.log('buyMarketplaceAccount network error:', error);
      setErrorMessage('Network connection error, please check your internet connection');
      setShowErrorModal(true);
    } finally {
      setPurchasingVariantId(null);
    }
  };

  const handleSearch = async () => {
    if (!selectedService) return;

    globalSearchData.serviceName = selectedService.name;

    setIsSearching(true);
    setHasSearched(false);

    try {
      const serviceRef = doc(db, 'marketplace', selectedService.name);
      const serviceSnap = await getDoc(serviceRef);

      const data = serviceSnap.data();
      const variants: AccountVariant[] = Array.isArray(data?.variants) ? data!.variants : [];

      const sorted = [...variants].sort((a, b) => Number(a.price) - Number(b.price));

      if (sorted.length > 0) {
        setSearchResults(sorted);
        setHasSearched(true);
      } else {
        setSearchResults([]);
        setHasSearched(false);
        setErrorMessage('No accounts available for this service');
        setShowErrorModal(true);
      }
    } catch (error) {

      setSearchResults([]);
      setHasSearched(false);

      let userErrorMessage = 'An error occurred while searching for accounts, please try again';

      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          userErrorMessage = 'You do not have permission to access the marketplace';
        } else if (error.message.includes('unavailable')) {
          userErrorMessage = 'Marketplace is temporarily unavailable, please try again later';
        } else if (error.message.includes('network')) {
          userErrorMessage = 'Network connection error, please check your internet connection';
        } else if (error.message.includes('not-found')) {
          userErrorMessage = 'Service not found, please contact customer support';
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
                Marketplace
              </h1>
              <p className="text-slate-300 text-md text-left">Purchase good-quality accounts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-blue-300 text-sm font-semibold mb-3">Important information about these accounts:</p>
            <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
              <li>• They can only be refunded if you have issues when signin in and such</li>
              <li>• They cannot be refunded once you have signed in</li>
              <li>• Type in the search bar the name of the desired service to get the accounts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2FA Announcement */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 mb-6">
        <p className="text-center text-sm">
          <span className="text-emerald-300 font-bold">READ CAREFULLY</span>
          <span className="text-slate-300 mx-2">—</span>
          <span className="text-slate-200">If your account needs <span className="text-emerald-400 font-semibold">2FA codes</span>, go to <a href="https://2fa.live" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-semibold hover:text-emerald-300 underline">2fa.live</a>, copy your 2FA secret key and generate your <span className="text-emerald-400 font-semibold">2FA code</span>!</span>
        </p>
      </div>

      {/* Main Content Section */}
      <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${isServiceDropdownOpen ? 'overflow-visible' : 'overflow-hidden'}`}>

        {!hasSearched ? (
          /* SEARCH VIEW */
          <div className="p-6">
            <div className="relative z-10 mx-auto">
              {/* Search Header */}
              <div className="text-left mb-9">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                  Search & Configure
                </h1>
                <p className="text-slate-300 text-md">Find and configure your service's accounts</p>
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
                        Which service do you want to purchase the accounts for?
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
                          placeholder={isLoadingServices ? "Loading services..." : "Amazon, Facebook, Gmail..."}
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

                  </div>

                </div>


                {/* Search Button */}
                <div className="flex flex-col items-center space-y-3">
                  <button
                    onClick={handleSearch}
                    disabled={!selectedService || isSearching || isLoadingServices || hasError}
                    className="group px-8 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[150px]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="relative z-10 flex items-center justify-center">
                      {isSearching || isLoadingServices ? (
                        <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <span className="group-hover:tracking-wide transition-all duration-300">
                          <span>
                            {isLoadingServices ? 'Loading...' : 'Search accounts'}
                          </span>
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Available accounts
                </h1>
                <p className="text-slate-300 text-md">
                  {searchResults.length > 0
                    ? `Found ${searchResults.length} ${searchResults.length === 1 ? 'account' : 'accounts'} for "${searchTerm}"`
                    : `No accounts found for "${searchTerm}"`}
                </p>
              </div>

              {/* Results Grid */}
              {searchResults.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {searchResults.map((variant, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-600/50 hover:border-emerald-500/50 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 flex flex-col w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] xl:w-[calc(25%-0.75rem)]"
                    >
                      {/* Card Body */}
                      <div className="flex-1 space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-medium">Country:</span>
                          <span className="text-white font-semibold text-right">
                            {variant.country == null ? 'Any' : variant.country}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-medium">Created in:</span>
                          <span className="text-white font-semibold">
                            {variant.creation_year == null ? '-' : variant.creation_year}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-medium">Email included:</span>
                          <span className={`font-semibold ${variant.email_included == null ? 'text-slate-400' : variant.email_included ? 'text-emerald-400' : 'text-red-400'}`}>
                            {variant.email_included == null ? '-' : variant.email_included ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-medium">2FA included:</span>
                          <span className={`font-semibold ${variant.has_2fa == null ? 'text-slate-400' : variant.has_2fa ? 'text-emerald-400' : 'text-red-400'}`}>
                            {variant.has_2fa == null ? '-' : variant.has_2fa ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700/50">
                          <span className="text-slate-300 font-medium">Price:</span>
                          <span className="text-emerald-400 font-bold text-base">
                            {variant.price == null ? '-' : `$${formatPrice(variant.price)}`}
                          </span>
                        </div>
                      </div>

                      {/* Purchase Button */}
                      <button
                        onClick={() => handlePurchaseClick(variant)}
                        disabled={purchasingVariantId !== null || !variant.id}
                        className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                      >
                        {purchasingVariantId === variant.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          'Purchase'
                        )}
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
                  <h4 className="text-2xl font-bold text-slate-300 mb-3">No Accounts Available</h4>
                  <p className="text-slate-400 text-lg">Try searching for a different service.</p>
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
  );
};

export default Marketplace;