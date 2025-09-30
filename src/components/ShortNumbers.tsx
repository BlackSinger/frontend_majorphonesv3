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
  serviceName: ''
};

// Global object to store purchase data
const globalPurchaseData = {
  serviceId: '',
  option: 0
};

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
  opt: string;
}

interface ServiceOption {
  id: string;
  name: string;
}

const ShortNumbers: React.FC = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  // Helper function to safely format price
  const formatPrice = (price: any): string => {
    // Convert to number and take only first 2 decimals
    const numPrice = parseFloat(Number(price).toFixed(2));
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };
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

  // Function to map country to Firestore collection name
  const getCollectionNameForCountry = (countryName: string): string => {
    switch (countryName) {
      case 'United States':
        return 'stnTargetsUSA';
      case 'United Kingdom':
        return 'stnTargetsUK';
      case 'India':
        return 'stnTargetsIndia';
      case 'Germany':
        return 'stnTargetsGermany';
      case 'France':
        return 'stnTargetsFrance';
      default:
        return 'stnTargetsUSA'; // Default fallback
    }
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

  // Load services from Firebase
  const loadServices = async (collectionName: string) => {
    try {
      setIsLoadingServices(true);
      setHasError(false);
      // Clear previous services and search state
      setServices([]);
      setFilteredServices([]);
      setSelectedService(null);
      setSearchTerm('');
      setIsServiceDropdownOpen(false);

      const servicesRef = collection(db, collectionName);
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
    const collectionName = getCollectionNameForCountry(selectedCountry);
    loadServices(collectionName);
  }, []);

  // Load services when country changes
  useEffect(() => {
    if (selectedCountry) {
      const collectionName = getCollectionNameForCountry(selectedCountry);
      loadServices(collectionName);
    }
  }, [selectedCountry]);

  // Close dropdowns when clicking outside
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

  // Handle error modal close
  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  // Handle purchase for opt6 numbers (reusable)
  const handleReuseUSAPurchase = async (uniqueOptionId: string) => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    setPurchasingOptionId(uniqueOptionId);

    try {
      // Get Firebase ID token using official method
      const idToken = await currentUser.getIdToken();

      // Log token for debugging (remove in production)
      console.log('Reuse USA - ID Token length:', idToken?.length);
      console.log('Reuse USA - ID Token starts with:', idToken?.substring(0, 20));

      // Make API call to reuseusa cloud function
      const response = await fetch('https://reuseusa-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: globalPurchaseData.serviceId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success case - redirect to history
        navigate('/history');
      } else {
        // Handle error responses for reuseusa
        let errorMsg = 'An unknown error occurred';

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Failed to get number') {
          errorMsg = 'We ran out of SIM cards, try again later';
        } else if (data.message === 'Internal Server Error') {
          errorMsg = 'Please contact our customer support';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Reuse USA purchase error:', error);
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
  };

  // Handle purchase for opt1, opt2, opt3 numbers (standard)
  const handleBuyShortUSAPurchase = async (uniqueOptionId: string) => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    setPurchasingOptionId(uniqueOptionId);

    try {
      // Get Firebase ID token using official method
      const idToken = await currentUser.getIdToken();

      // Log token for debugging (remove in production)
      console.log('Buy Short USA - ID Token length:', idToken?.length);
      console.log('Buy Short USA - ID Token starts with:', idToken?.substring(0, 20));

      // Make API call to buyshortusa cloud function
      const response = await fetch('https://buyshortusa-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: globalPurchaseData.serviceId,
          option: globalPurchaseData.option
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success case - redirect to history
        navigate('/history');
      } else {
        // Handle error responses for buyshortusa
        let errorMsg = 'An unknown error occurred';

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.message === 'Missing parameters in request body') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Service unavailable') {
          errorMsg = 'We ran out of SIM cards, try again later';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Internal Server Error') {
          errorMsg = 'Please contact our customer support';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Buy Short USA purchase error:', error);
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
  };

  // Handle purchase for UK numbers (opt2, opt5)
  const handleBuyShortUKPurchase = async (uniqueOptionId: string) => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    setPurchasingOptionId(uniqueOptionId);

    try {
      // Get Firebase ID token using official method
      const idToken = await currentUser.getIdToken();

      // Log token for debugging (remove in production)
      console.log('Buy Short UK - ID Token length:', idToken?.length);
      console.log('Buy Short UK - ID Token starts with:', idToken?.substring(0, 20));

      // Make API call to buyshortuk cloud function
      const response = await fetch('https://buyshortuk-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: globalPurchaseData.serviceId,
          option: globalPurchaseData.option
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success case - redirect to history
        navigate('/history');
      } else {
        // Handle error responses for buyshortuk
        let errorMsg = 'An unknown error occurred';

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.message === 'Missing parameters in request body') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Service unavailable') {
          errorMsg = 'We ran out of SIM cards, try again later';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Internal Server Error') {
          errorMsg = 'Please contact our customer support';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Buy Short UK purchase error:', error);
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
  };

  // Handle purchase for India numbers (opt2, opt5)
  const handleBuyShortIndiaPurchase = async (uniqueOptionId: string) => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    setPurchasingOptionId(uniqueOptionId);

    try {
      // Get Firebase ID token using official method
      const idToken = await currentUser.getIdToken();

      // Log token for debugging (remove in production)
      console.log('Buy Short India - ID Token length:', idToken?.length);
      console.log('Buy Short India - ID Token starts with:', idToken?.substring(0, 20));

      // Make API call to buyshortindia cloud function
      const response = await fetch('https://buyshortindia-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: globalPurchaseData.serviceId,
          option: globalPurchaseData.option
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success case - redirect to history
        navigate('/history');
      } else {
        // Handle error responses for buyshortindia
        let errorMsg = 'An unknown error occurred';

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.message === 'Missing parameters in request body') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Service unavailable') {
          errorMsg = 'We ran out of SIM cards, try again later';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Internal Server Error') {
          errorMsg = 'Please contact our customer support';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Buy Short India purchase error:', error);
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
  };

  // Handle purchase for Germany numbers (opt2, opt5)
  const handleBuyShortGermanyPurchase = async (uniqueOptionId: string) => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    setPurchasingOptionId(uniqueOptionId);

    try {
      // Get Firebase ID token using official method
      const idToken = await currentUser.getIdToken();

      // Log token for debugging (remove in production)
      console.log('Buy Short Germany - ID Token length:', idToken?.length);
      console.log('Buy Short Germany - ID Token starts with:', idToken?.substring(0, 20));

      // Make API call to buyshortgermany cloud function
      const response = await fetch('https://buyshortgermany-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: globalPurchaseData.serviceId,
          option: globalPurchaseData.option
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success case - redirect to history
        navigate('/history');
      } else {
        // Handle error responses for buyshortgermany
        let errorMsg = 'An unknown error occurred';

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.message === 'Missing parameters in request body') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Service unavailable') {
          errorMsg = 'We ran out of SIM cards, try again later';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Internal Server Error') {
          errorMsg = 'Please contact our customer support';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Buy Short Germany purchase error:', error);
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
  };

  // Handle purchase for France numbers (opt2, opt5)
  const handleBuyShortFrancePurchase = async (uniqueOptionId: string) => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    setPurchasingOptionId(uniqueOptionId);

    try {
      // Get Firebase ID token using official method
      const idToken = await currentUser.getIdToken();

      // Log token for debugging (remove in production)
      console.log('Buy Short France - ID Token length:', idToken?.length);
      console.log('Buy Short France - ID Token starts with:', idToken?.substring(0, 20));

      // Make API call to buyshortfrance cloud function
      const response = await fetch('https://buyshortfrance-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: globalPurchaseData.serviceId,
          option: globalPurchaseData.option
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success case - redirect to history
        navigate('/history');
      } else {
        // Handle error responses for buyshortfrance
        let errorMsg = 'An unknown error occurred';

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.message === 'Missing parameters in request body') {
          errorMsg = 'Please refresh the page and try again';
        } else if (data.message === 'Service unavailable') {
          errorMsg = 'We ran out of SIM cards, try again later';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Internal Server Error') {
          errorMsg = 'Please contact our customer support';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Buy Short France purchase error:', error);
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
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
      setFilteredServices([{ id: 'not-listed', name: 'Service not listed' }]);
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

  // Handle purchase click to log option data
  const handlePurchaseClick = (option: NumberOption) => {
    // Fill global purchase data
    globalPurchaseData.serviceId = option.id;

    // Map opt to option number based on country
    if (selectedCountry === 'United States') {
      // USA has opt1, opt2, opt3, opt6
      switch (option.opt) {
        case 'opt1':
          globalPurchaseData.option = 1;
          break;
        case 'opt2':
          globalPurchaseData.option = 2;
          break;
        case 'opt3':
          globalPurchaseData.option = 3;
          break;
        case 'opt6':
          globalPurchaseData.option = 6;
          break;
        default:
          globalPurchaseData.option = 0; // fallback
      }
    } else {
      // UK, India, Germany, France have opt2, opt5
      switch (option.opt) {
        case 'opt2':
          globalPurchaseData.option = 2;
          break;
        case 'opt5':
          globalPurchaseData.option = 5;
          break;
        default:
          globalPurchaseData.option = 0; // fallback
      }
    }

    // Log the global purchase data
    console.log('Purchase clicked:', {
      serviceId: globalPurchaseData.serviceId,
      option: globalPurchaseData.option,
      opt: option.opt
    });

    // Create unique identifier combining serviceId and opt
    const uniqueOptionId = `${option.id}-${option.opt}`;

    // Handle purchase based on selected country
    if (selectedCountry === 'United States') {
      // Use different cloud functions based on opt
      if (option.opt === 'opt6') {
        // Use reuseusa cloud function for opt6 (reusable numbers)
        handleReuseUSAPurchase(uniqueOptionId);
      } else {
        // Use buyshortusa cloud function for opt1, opt2, opt3
        handleBuyShortUSAPurchase(uniqueOptionId);
      }
    } else if (selectedCountry === 'United Kingdom') {
      // Use buyshortuk cloud function for opt2, opt5
      handleBuyShortUKPurchase(uniqueOptionId);
    } else if (selectedCountry === 'India') {
      // Use buyshortindia cloud function for opt2, opt5
      handleBuyShortIndiaPurchase(uniqueOptionId);
    } else if (selectedCountry === 'Germany') {
      // Use buyshortgermany cloud function for opt2, opt5
      handleBuyShortGermanyPurchase(uniqueOptionId);
    } else if (selectedCountry === 'France') {
      // Use buyshortfrance cloud function for opt2, opt5
      handleBuyShortFrancePurchase(uniqueOptionId);
    }
  };

  const handleSearch = async () => {
    if (!selectedService) return;

    // Store service name in global object
    globalSearchData.serviceName = selectedService.name;

    // Print to console for verification
    console.log('Selected service name:', globalSearchData.serviceName);

    setIsSearching(true);
    setHasSearched(false);

    try {
      let allNumbers: NumberOption[] = [];

      // For United States, search in stnUSA collection
      if (selectedCountry === 'United States') {
        // Search across opt1, opt2, opt3, opt6 documents and their services subcollections simultaneously
        const searchPromises = ['opt1', 'opt2', 'opt3', 'opt6'].map(async (optDoc) => {
          const servicesRef = collection(db, 'stnUSA', optDoc, 'services');
          const querySnapshot = await getDocs(servicesRef);

          const results: NumberOption[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Check if service name matches EXACTLY (case insensitive)
            if (data.serviceName && data.serviceName.toLowerCase() === globalSearchData.serviceName.toLowerCase()) {
              const selectedCountryData = countries.find(c => c.name === selectedCountry);
              const countryCode = selectedCountryData?.code || 'US';
              const countryPrefix = selectedCountryData?.prefix || '+1';

              // Map properties based on source document
              const isOpt3 = optDoc === 'opt3';
              const isOpt6 = optDoc === 'opt6';

              results.push({
                id: data.id,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                price: data.price, // Only use Firestore price
                extraSmsPrice: isOpt6 ? (data.price / 2) : undefined, // Only opt6 has extraSmsPrice for reuse (half of price)
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                isReusable: isOpt6, // Only opt6 is reusable
                receiveSend: isOpt3, // Only opt3 has receive/send capability
                opt: optDoc
              });
            }
          });

          return results;
        });

        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);

        // Flatten results from all documents
        allNumbers = searchResults.flat();

        // Sort by price (lowest first)
        allNumbers.sort((a, b) => a.price - b.price);
      } else if (selectedCountry === 'United Kingdom') {
        // For United Kingdom, search in stnUK collection (opt2 and opt5 only)
        const searchPromises = ['opt2', 'opt5'].map(async (optDoc) => {
          const servicesRef = collection(db, 'stnUK', optDoc, 'services');
          const querySnapshot = await getDocs(servicesRef);

          const results: NumberOption[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Check if service name matches EXACTLY (case insensitive)
            if (data.serviceName && data.serviceName.toLowerCase() === globalSearchData.serviceName.toLowerCase()) {
              const selectedCountryData = countries.find(c => c.name === selectedCountry);
              const countryCode = selectedCountryData?.code || 'GB';
              const countryPrefix = selectedCountryData?.prefix || '+44';

              // Both opt2 and opt5 for UK have same properties: not reusable, no receive/send
              results.push({
                id: data.id,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                price: data.price, // Only use Firestore price
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                isReusable: false, // Both options are not reusable
                receiveSend: false, // Both options do not have receive/send
                opt: optDoc
              });
            }
          });

          return results;
        });

        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);

        // Flatten results from all documents
        allNumbers = searchResults.flat();

        // Sort by price (lowest first)
        allNumbers.sort((a, b) => a.price - b.price);
      } else if (selectedCountry === 'India') {
        // For India, search in stnIndia collection (opt2 and opt5 only)
        const searchPromises = ['opt2', 'opt5'].map(async (optDoc) => {
          const servicesRef = collection(db, 'stnIndia', optDoc, 'services');
          const querySnapshot = await getDocs(servicesRef);

          const results: NumberOption[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Check if service name matches EXACTLY (case insensitive)
            if (data.serviceName && data.serviceName.toLowerCase() === globalSearchData.serviceName.toLowerCase()) {
              const selectedCountryData = countries.find(c => c.name === selectedCountry);
              const countryCode = selectedCountryData?.code || 'IN';
              const countryPrefix = selectedCountryData?.prefix || '+91';

              // Both opt2 and opt5 for India have same properties: not reusable, no receive/send
              results.push({
                id: data.id,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                price: data.price, // Only use Firestore price
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                isReusable: false, // Both options are not reusable
                receiveSend: false, // Both options do not have receive/send
                opt: optDoc
              });
            }
          });

          return results;
        });

        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);

        // Flatten results from all documents
        allNumbers = searchResults.flat();

        // Sort by price (lowest first)
        allNumbers.sort((a, b) => a.price - b.price);
      } else if (selectedCountry === 'Germany') {
        // For Germany, search in stnGermany collection (opt2 and opt5 only)
        const searchPromises = ['opt2', 'opt5'].map(async (optDoc) => {
          const servicesRef = collection(db, 'stnGermany', optDoc, 'services');
          const querySnapshot = await getDocs(servicesRef);

          const results: NumberOption[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Check if service name matches EXACTLY (case insensitive)
            if (data.serviceName && data.serviceName.toLowerCase() === globalSearchData.serviceName.toLowerCase()) {
              const selectedCountryData = countries.find(c => c.name === selectedCountry);
              const countryCode = selectedCountryData?.code || 'DE';
              const countryPrefix = selectedCountryData?.prefix || '+49';

              // Both opt2 and opt5 for Germany have same properties: not reusable, no receive/send
              results.push({
                id: data.id,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                price: data.price, // Only use Firestore price
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                isReusable: false, // Both options are not reusable
                receiveSend: false, // Both options do not have receive/send
                opt: optDoc
              });
            }
          });

          return results;
        });

        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);

        // Flatten results from all documents
        allNumbers = searchResults.flat();

        // Sort by price (lowest first)
        allNumbers.sort((a, b) => a.price - b.price);
      } else if (selectedCountry === 'France') {
        // For France, search in stnFrance collection (opt2 and opt5 only)
        const searchPromises = ['opt2', 'opt5'].map(async (optDoc) => {
          const servicesRef = collection(db, 'stnFrance', optDoc, 'services');
          const querySnapshot = await getDocs(servicesRef);

          const results: NumberOption[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Check if service name matches EXACTLY (case insensitive)
            if (data.serviceName && data.serviceName.toLowerCase() === globalSearchData.serviceName.toLowerCase()) {
              const selectedCountryData = countries.find(c => c.name === selectedCountry);
              const countryCode = selectedCountryData?.code || 'FR';
              const countryPrefix = selectedCountryData?.prefix || '+33';

              // Both opt2 and opt5 for France have same properties: not reusable, no receive/send
              results.push({
                id: data.id,
                number: `${countryPrefix}-XXXXXX`, // No numbers needed, just placeholder
                price: data.price, // Only use Firestore price
                country: selectedCountry,
                countryCode: countryCode,
                countryPrefix: countryPrefix,
                isReusable: false, // Both options are not reusable
                receiveSend: false, // Both options do not have receive/send
                opt: optDoc
              });
            }
          });

          return results;
        });

        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);

        // Flatten results from all documents
        allNumbers = searchResults.flat();

        // Sort by price (lowest first)
        allNumbers.sort((a, b) => a.price - b.price);
      } else {
        // For other countries, no collections available yet
        allNumbers = [];
      }

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
          userErrorMessage = 'Number collection not found, please contact customer support';
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
        <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${(isCountryDropdownOpen || isServiceDropdownOpen) ? 'overflow-visible' : 'overflow-hidden'}`}>
            
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
                              onClick={() => !isLoadingServices && !hasError && !isSearching && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                              className={`w-full pl-12 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between ${
                                isLoadingServices || hasError || isSearching
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer hover:border-slate-500/50'
                              }`}
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
                            {isCountryDropdownOpen && !isLoadingServices && !hasError && !isSearching && (
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
                                {isLoadingServices ? 'Loading...' : 'Search numbers'}
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
                                   searchResults.indexOf(option) === 1 ? '2nd' :
                                   searchResults.indexOf(option) === 2 ? '3rd' : '4th'}
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
                              {/* Price, Reusable, Each Reuse, Receive/Send in order */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-md">
                                  <span className="text-slate-300 font-medium">Price:</span>
                                  <span className="text-emerald-400 font-semibold">
                                    ${formatPrice(option.price)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-md">
                                  <span className="text-slate-300 font-medium">Reusable:</span>
                                  <span className={`font-semibold ${option.isReusable ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {option.isReusable ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                {option.isReusable && option.extraSmsPrice && (
                                  <div className="flex items-center justify-between text-md">
                                    <span className="text-slate-300 font-medium">Each reuse:</span>
                                    <span className="text-emerald-400 font-semibold">
                                      ${formatPrice(option.extraSmsPrice)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-md">
                                  <span className="text-slate-300 font-medium">Receive/Send:</span>
                                  <span className={`font-semibold ${option.receiveSend ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {option.receiveSend ? 'Yes' : 'No'}
                                  </span>
                                </div>
                              </div>
                              {/* Purchase Button - full width */}
                              <button
                                onClick={() => handlePurchaseClick(option)}
                                disabled={purchasingOptionId !== null}
                                className="w-full px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] text-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[120px]"
                              >
                                {purchasingOptionId === `${option.id}-${option.opt}` ? (
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

                            {/* Desktop Layout - ordered: Price, Reusable, Each Reuse, Receive/Send, Purchase */}
                            <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                              <span className="text-slate-300 font-medium">Price:</span>
                              <span className="text-emerald-400 font-semibold">
                                ${formatPrice(option.price)}
                              </span>
                            </div>

                            <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                              <span className="text-slate-300 font-medium">Reusable:</span>
                              <span className={`font-semibold ${option.isReusable ? 'text-emerald-400' : 'text-red-400'}`}>
                                {option.isReusable ? 'Yes' : 'No'}
                              </span>
                            </div>

                            {option.isReusable && option.extraSmsPrice && (
                              <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                                <span className="text-slate-300 font-medium">Each reuse:</span>
                                <span className="text-emerald-400 font-semibold">
                                  ${formatPrice(option.extraSmsPrice)}
                                </span>
                              </div>
                            )}

                            <div className="hidden md:flex md:items-center md:space-x-2 text-md">
                              <span className="text-slate-300 font-medium">Receive/Send:</span>
                              <span className={`font-semibold ${option.receiveSend ? 'text-emerald-400' : 'text-red-400'}`}>
                                {option.receiveSend ? 'Yes' : 'No'}
                              </span>
                            </div>

                            <button
                              onClick={() => handlePurchaseClick(option)}
                              disabled={purchasingOptionId !== null}
                              className="hidden md:block px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[120px]"
                            >
                              {purchasingOptionId === `${option.id}-${option.opt}` ? (
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

export default ShortNumbers;