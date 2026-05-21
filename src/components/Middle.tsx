import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [filteredServices, setFilteredServices] = useState<ServiceOption[]>([]);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  const [purchasingOptionId, setPurchasingOptionId] = useState<string | null>(null);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [pendingOption, setPendingOption] = useState<NumberOption | null>(null);
  const [selectedAreaCode, setSelectedAreaCode] = useState('Random');
  const [isAreaCodeDropdownOpen, setIsAreaCodeDropdownOpen] = useState(false);
  const [areaCodeSearchTerm, setAreaCodeSearchTerm] = useState('');

  const [serviceAvailability, setServiceAvailability] = useState<{ inOpt4: boolean; inOpt5: boolean }>({ inOpt4: false, inOpt5: false });

  const areaCodeData: { code: string; state: string }[] = [
    { code: '205', state: 'Alabama' }, { code: '251', state: 'Alabama' }, { code: '256', state: 'Alabama' }, { code: '334', state: 'Alabama' }, { code: '938', state: 'Alabama' },
    { code: '907', state: 'Alaska' },
    { code: '480', state: 'Arizona' }, { code: '520', state: 'Arizona' }, { code: '602', state: 'Arizona' }, { code: '623', state: 'Arizona' },
    { code: '479', state: 'Arkansas' }, { code: '501', state: 'Arkansas' }, { code: '870', state: 'Arkansas' },
    { code: '209', state: 'California' }, { code: '213', state: 'California' }, { code: '279', state: 'California' }, { code: '310', state: 'California' }, { code: '341', state: 'California' }, { code: '369', state: 'California' }, { code: '408', state: 'California' }, { code: '415', state: 'California' }, { code: '424', state: 'California' }, { code: '442', state: 'California' }, { code: '510', state: 'California' }, { code: '559', state: 'California' }, { code: '562', state: 'California' }, { code: '619', state: 'California' }, { code: '650', state: 'California' }, { code: '657', state: 'California' }, { code: '661', state: 'California' }, { code: '669', state: 'California' }, { code: '707', state: 'California' }, { code: '714', state: 'California' }, { code: '747', state: 'California' }, { code: '805', state: 'California' }, { code: '818', state: 'California' }, { code: '831', state: 'California' }, { code: '840', state: 'California' }, { code: '858', state: 'California' }, { code: '925', state: 'California' }, { code: '949', state: 'California' }, { code: '951', state: 'California' },
    { code: '303', state: 'Colorado' }, { code: '719', state: 'Colorado' }, { code: '970', state: 'Colorado' },
    { code: '203', state: 'Connecticut' }, { code: '475', state: 'Connecticut' }, { code: '860', state: 'Connecticut' },
    { code: '302', state: 'Delaware' },
    { code: '239', state: 'Florida' }, { code: '305', state: 'Florida' }, { code: '321', state: 'Florida' }, { code: '352', state: 'Florida' }, { code: '386', state: 'Florida' }, { code: '407', state: 'Florida' }, { code: '448', state: 'Florida' }, { code: '561', state: 'Florida' }, { code: '656', state: 'Florida' }, { code: '689', state: 'Florida' }, { code: '727', state: 'Florida' }, { code: '728', state: 'Florida' }, { code: '772', state: 'Florida' }, { code: '850', state: 'Florida' }, { code: '863', state: 'Florida' }, { code: '904', state: 'Florida' }, { code: '941', state: 'Florida' },
    { code: '229', state: 'Georgia' }, { code: '404', state: 'Georgia' }, { code: '470', state: 'Georgia' }, { code: '478', state: 'Georgia' }, { code: '678', state: 'Georgia' }, { code: '706', state: 'Georgia' }, { code: '762', state: 'Georgia' }, { code: '912', state: 'Georgia' },
    { code: '808', state: 'Hawaii' },
    { code: '208', state: 'Idaho' },
    { code: '217', state: 'Illinois' }, { code: '224', state: 'Illinois' }, { code: '309', state: 'Illinois' }, { code: '312', state: 'Illinois' }, { code: '331', state: 'Illinois' }, { code: '447', state: 'Illinois' }, { code: '464', state: 'Illinois' }, { code: '618', state: 'Illinois' }, { code: '630', state: 'Illinois' }, { code: '708', state: 'Illinois' }, { code: '730', state: 'Illinois' }, { code: '773', state: 'Illinois' }, { code: '779', state: 'Illinois' }, { code: '815', state: 'Illinois' },
    { code: '219', state: 'Indiana' }, { code: '260', state: 'Indiana' }, { code: '317', state: 'Indiana' }, { code: '463', state: 'Indiana' }, { code: '574', state: 'Indiana' }, { code: '765', state: 'Indiana' }, { code: '812', state: 'Indiana' },
    { code: '515', state: 'Iowa' }, { code: '563', state: 'Iowa' }, { code: '641', state: 'Iowa' }, { code: '712', state: 'Iowa' },
    { code: '316', state: 'Kansas' }, { code: '620', state: 'Kansas' }, { code: '785', state: 'Kansas' }, { code: '913', state: 'Kansas' },
    { code: '270', state: 'Kentucky' }, { code: '502', state: 'Kentucky' }, { code: '606', state: 'Kentucky' }, { code: '859', state: 'Kentucky' },
    { code: '225', state: 'Louisiana' }, { code: '318', state: 'Louisiana' }, { code: '337', state: 'Louisiana' }, { code: '504', state: 'Louisiana' }, { code: '985', state: 'Louisiana' },
    { code: '207', state: 'Maine' },
    { code: '227', state: 'Maryland' }, { code: '240', state: 'Maryland' }, { code: '301', state: 'Maryland' }, { code: '443', state: 'Maryland' }, { code: '667', state: 'Maryland' },
    { code: '351', state: 'Massachusetts' }, { code: '413', state: 'Massachusetts' }, { code: '508', state: 'Massachusetts' }, { code: '617', state: 'Massachusetts' }, { code: '978', state: 'Massachusetts' },
    { code: '231', state: 'Michigan' }, { code: '248', state: 'Michigan' }, { code: '269', state: 'Michigan' }, { code: '517', state: 'Michigan' }, { code: '586', state: 'Michigan' }, { code: '616', state: 'Michigan' }, { code: '734', state: 'Michigan' }, { code: '810', state: 'Michigan' }, { code: '906', state: 'Michigan' }, { code: '947', state: 'Michigan' },
    { code: '507', state: 'Minnesota' }, { code: '612', state: 'Minnesota' }, { code: '651', state: 'Minnesota' }, { code: '763', state: 'Minnesota' }, { code: '952', state: 'Minnesota' },
    { code: '228', state: 'Mississippi' }, { code: '601', state: 'Mississippi' }, { code: '662', state: 'Mississippi' }, { code: '769', state: 'Mississippi' },
    { code: '314', state: 'Missouri' }, { code: '417', state: 'Missouri' }, { code: '573', state: 'Missouri' }, { code: '636', state: 'Missouri' }, { code: '660', state: 'Missouri' }, { code: '816', state: 'Missouri' },
    { code: '406', state: 'Montana' },
    { code: '308', state: 'Nebraska' }, { code: '402', state: 'Nebraska' }, { code: '531', state: 'Nebraska' },
    { code: '702', state: 'Nevada' }, { code: '725', state: 'Nevada' }, { code: '775', state: 'Nevada' },
    { code: '603', state: 'New Hampshire' },
    { code: '201', state: 'New Jersey' }, { code: '551', state: 'New Jersey' }, { code: '609', state: 'New Jersey' }, { code: '732', state: 'New Jersey' }, { code: '848', state: 'New Jersey' }, { code: '856', state: 'New Jersey' }, { code: '862', state: 'New Jersey' }, { code: '908', state: 'New Jersey' }, { code: '973', state: 'New Jersey' },
    { code: '505', state: 'New Mexico' }, { code: '575', state: 'New Mexico' },
    { code: '212', state: 'New York' }, { code: '315', state: 'New York' }, { code: '332', state: 'New York' }, { code: '347', state: 'New York' }, { code: '516', state: 'New York' }, { code: '518', state: 'New York' }, { code: '585', state: 'New York' }, { code: '607', state: 'New York' }, { code: '631', state: 'New York' }, { code: '646', state: 'New York' }, { code: '680', state: 'New York' }, { code: '716', state: 'New York' }, { code: '718', state: 'New York' }, { code: '838', state: 'New York' }, { code: '845', state: 'New York' }, { code: '914', state: 'New York' }, { code: '917', state: 'New York' }, { code: '929', state: 'New York' }, { code: '934', state: 'New York' },
    { code: '252', state: 'North Carolina' }, { code: '336', state: 'North Carolina' }, { code: '704', state: 'North Carolina' }, { code: '743', state: 'North Carolina' }, { code: '828', state: 'North Carolina' }, { code: '910', state: 'North Carolina' }, { code: '919', state: 'North Carolina' }, { code: '980', state: 'North Carolina' }, { code: '984', state: 'North Carolina' },
    { code: '701', state: 'North Dakota' },
    { code: '216', state: 'Ohio' }, { code: '220', state: 'Ohio' }, { code: '234', state: 'Ohio' }, { code: '330', state: 'Ohio' }, { code: '380', state: 'Ohio' }, { code: '419', state: 'Ohio' }, { code: '440', state: 'Ohio' }, { code: '513', state: 'Ohio' }, { code: '567', state: 'Ohio' }, { code: '614', state: 'Ohio' }, { code: '740', state: 'Ohio' }, { code: '937', state: 'Ohio' },
    { code: '405', state: 'Oklahoma' }, { code: '539', state: 'Oklahoma' }, { code: '580', state: 'Oklahoma' }, { code: '918', state: 'Oklahoma' },
    { code: '458', state: 'Oregon' }, { code: '503', state: 'Oregon' }, { code: '541', state: 'Oregon' }, { code: '971', state: 'Oregon' },
    { code: '215', state: 'Pennsylvania' }, { code: '223', state: 'Pennsylvania' }, { code: '267', state: 'Pennsylvania' }, { code: '272', state: 'Pennsylvania' }, { code: '412', state: 'Pennsylvania' }, { code: '445', state: 'Pennsylvania' }, { code: '484', state: 'Pennsylvania' }, { code: '570', state: 'Pennsylvania' }, { code: '582', state: 'Pennsylvania' }, { code: '610', state: 'Pennsylvania' }, { code: '717', state: 'Pennsylvania' }, { code: '724', state: 'Pennsylvania' }, { code: '814', state: 'Pennsylvania' }, { code: '878', state: 'Pennsylvania' },
    { code: '401', state: 'Rhode Island' },
    { code: '803', state: 'South Carolina' }, { code: '839', state: 'South Carolina' }, { code: '843', state: 'South Carolina' }, { code: '854', state: 'South Carolina' }, { code: '864', state: 'South Carolina' },
    { code: '605', state: 'South Dakota' },
    { code: '423', state: 'Tennessee' }, { code: '615', state: 'Tennessee' }, { code: '629', state: 'Tennessee' }, { code: '731', state: 'Tennessee' }, { code: '865', state: 'Tennessee' }, { code: '901', state: 'Tennessee' }, { code: '931', state: 'Tennessee' },
    { code: '210', state: 'Texas' }, { code: '214', state: 'Texas' }, { code: '254', state: 'Texas' }, { code: '281', state: 'Texas' }, { code: '325', state: 'Texas' }, { code: '346', state: 'Texas' }, { code: '361', state: 'Texas' }, { code: '409', state: 'Texas' }, { code: '430', state: 'Texas' }, { code: '432', state: 'Texas' }, { code: '469', state: 'Texas' }, { code: '512', state: 'Texas' }, { code: '682', state: 'Texas' }, { code: '713', state: 'Texas' }, { code: '726', state: 'Texas' }, { code: '737', state: 'Texas' }, { code: '806', state: 'Texas' }, { code: '817', state: 'Texas' }, { code: '830', state: 'Texas' }, { code: '832', state: 'Texas' }, { code: '903', state: 'Texas' }, { code: '915', state: 'Texas' }, { code: '936', state: 'Texas' }, { code: '940', state: 'Texas' }, { code: '945', state: 'Texas' }, { code: '956', state: 'Texas' }, { code: '972', state: 'Texas' }, { code: '979', state: 'Texas' },
    { code: '385', state: 'Utah' }, { code: '435', state: 'Utah' }, { code: '801', state: 'Utah' },
    { code: '802', state: 'Vermont' },
    { code: '276', state: 'Virginia' }, { code: '434', state: 'Virginia' }, { code: '540', state: 'Virginia' }, { code: '571', state: 'Virginia' }, { code: '703', state: 'Virginia' }, { code: '757', state: 'Virginia' }, { code: '804', state: 'Virginia' },
    { code: '206', state: 'Washington' }, { code: '253', state: 'Washington' }, { code: '360', state: 'Washington' }, { code: '425', state: 'Washington' }, { code: '509', state: 'Washington' }, { code: '564', state: 'Washington' },
    { code: '304', state: 'West Virginia' }, { code: '681', state: 'West Virginia' },
    { code: '262', state: 'Wisconsin' }, { code: '414', state: 'Wisconsin' }, { code: '534', state: 'Wisconsin' }, { code: '608', state: 'Wisconsin' }, { code: '715', state: 'Wisconsin' }, { code: '920', state: 'Wisconsin' },
    { code: '307', state: 'Wyoming' },
  ];

  const dropdownRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const areaCodeDropdownRef = useRef<HTMLDivElement>(null);

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

      const catalogRef = doc(db, 'allCatalog', 'catalog');
      const catalogSnap = await getDoc(catalogRef);
      const catalogData = catalogSnap.data();
      const middleUSANames: string[] = catalogData?.middleUSA || [];

      const servicesList: ServiceOption[] = middleUSANames
        .map(name => ({ id: name, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

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
      if (areaCodeDropdownRef.current && !areaCodeDropdownRef.current.contains(event.target as Node)) {
        setIsAreaCodeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePurchaseClick = (option: NumberOption) => {

    if (serviceAvailability.inOpt4 && !serviceAvailability.inOpt5) {
      handleDirectPurchase(option);
    } else if (!serviceAvailability.inOpt4 && serviceAvailability.inOpt5) {
      setPendingOption(option);
      setSelectedAreaCode(areaCodeData[0].code);
      setAreaCodeSearchTerm('');
      setShowCustomModal(true);
    } else if (serviceAvailability.inOpt4 && serviceAvailability.inOpt5) {
      setPendingOption(option);
      setSelectedAreaCode('Random');
      setAreaCodeSearchTerm('');
      setShowCustomModal(true);
    }
  };

  const handleDirectPurchase = async (option: NumberOption) => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    const uniqueOptionId = `${option.duration}days-${option.id}`;
    setPurchasingOptionId(uniqueOptionId);

    try {
      const servicesRef = collection(db, 'middleUSA', 'opt4', 'services');
      const querySnapshot = await getDocs(servicesRef);
      let serviceId = '';
      let foundData = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase() === globalSearchData.name.toLowerCase()) {
          serviceId = doc.id;
          foundData = { id: doc.id, ...data };
        }
      });

      if (!serviceId) {
        setErrorMessage('Please refresh the page and try again');
        setShowErrorModal(true);
        setPurchasingOptionId(null);
        return;
      }

      globalPurchaseData.serviceId = serviceId;
      globalPurchaseData.duration = option.duration;

      const bodyData: Record<string, any> = {
        serviceId: globalPurchaseData.serviceId,
        duration: globalPurchaseData.duration
      };

      const idToken = await currentUser.getIdToken();
      const response = await fetch('https://buymiddleusa-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigate('/history');
      } else {
        let errorMsg = 'We ran out of SIM cards, try again later';

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
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
    }
  };

  const handleCustomModalProceed = async () => {
    if (!pendingOption) return;

    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      setShowCustomModal(false);
      setErrorMessage('You are not authenticated or your token is invalid');
      setShowErrorModal(true);
      return;
    }

    const option = pendingOption;
    const uniqueOptionId = `${option.duration}days-${option.id}`;
    setShowCustomModal(false);
    setPurchasingOptionId(uniqueOptionId);

    try {
      const searchPromises = ['opt4', 'opt5'].map(async (optDoc) => {
        const servicesRef = collection(db, 'middleUSA', optDoc, 'services');
        const querySnapshot = await getDocs(servicesRef);
        let foundId = '';
        let foundData = null;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name && data.name.toLowerCase() === globalSearchData.name.toLowerCase()) {
            foundId = doc.id;
            foundData = { id: doc.id, ...data };
          }
        });
        return foundId;
      });

      const [idFromOpt4, idFromOpt5] = await Promise.all(searchPromises);
      const serviceId = selectedAreaCode === 'Random' ? idFromOpt4 : idFromOpt5;

      if (!serviceId) {
        setErrorMessage('Please refresh the page and try again');
        setShowErrorModal(true);
        setPurchasingOptionId(null);
        setPendingOption(null);
        return;
      }

      globalPurchaseData.serviceId = serviceId;
      globalPurchaseData.duration = option.duration;

      const bodyData: Record<string, any> = {
        serviceId: globalPurchaseData.serviceId,
        duration: globalPurchaseData.duration
      };

      if (selectedAreaCode !== 'Random') {
        bodyData.areaCode = selectedAreaCode;
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch('https://buymiddleusa-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigate('/history');
      } else {
        let errorMsg = 'We ran out of SIM cards, try again later';

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
      setErrorMessage('Please contact our customer support');
      setShowErrorModal(true);
    } finally {
      setPurchasingOptionId(null);
      setPendingOption(null);
    }
  };

  const handleSearch = async () => {
    if (!selectedService) return;

    globalSearchData.name = selectedService.name;

    setIsSearching(true);
    setHasSearched(false);

    try {
      let allNumbers: NumberOption[] = [];

      const selectedCountryData = countries.find(c => c.name === selectedCountry);
      const countryCode = selectedCountryData?.code || 'US';
      const countryPrefix = selectedCountryData?.prefix || '+1';

      const searchPromises = ['opt4', 'opt5'].map(async (optDoc) => {
        const servicesRef = collection(db, 'middleUSA', optDoc, 'services');
        const querySnapshot = await getDocs(servicesRef);

        let matchedData: any = null;
        let matchedDocId = '';

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          let shouldInclude = false;

          if (globalSearchData.name.toLowerCase() === 'service not listed') {
            shouldInclude = doc.id === 'allservices';
          } else {
            shouldInclude = data.name && data.name.toLowerCase() === globalSearchData.name.toLowerCase();
          }

          if (shouldInclude && !matchedData) {
            matchedData = data;
            matchedDocId = doc.id;
          }
        });

        return { matchedData, matchedDocId };
      });

      const results = await Promise.all(searchPromises);

      const inOpt4 = results[0].matchedData !== null;
      const inOpt5 = results[1].matchedData !== null;
      setServiceAvailability({ inOpt4, inOpt5 });

      const found = results.find(r => r.matchedData !== null);

      if (found && found.matchedData) {
        const data = found.matchedData;
        const docId = found.matchedDocId;

        if (docId === 'allservices') {
          if (data.priceSevenDays) {
            allNumbers.push({
              id: `7days-${docId}`,
              number: `${countryPrefix}-XXXXXX`,
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
              id: `14days-${docId}`,
              number: `${countryPrefix}-XXXXXX`,
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
          if (data.priceOneDay) {
            allNumbers.push({
              id: `1day-${docId}`,
              number: `${countryPrefix}-XXXXXX`,
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
              id: `7days-${docId}`,
              number: `${countryPrefix}-XXXXXX`,
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
              id: `14days-${docId}`,
              number: `${countryPrefix}-XXXXXX`,
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
              <li>• You can choose area code for some middle numbers</li>
              <li>• These numbers last 1, 7 or 14 days depending on the option specified</li>
              <li>• Their duration can only be extended before they expire</li>
              <li>• After purchased, some can be cancelled and some can't</li>
              <li>• Users that deposit through Amazon Pay can't purchase them</li>
              <li>• If you want to reuse a number for 9-10 minutes or choose area code/carrier, go to <Link to="/short" className="text-blue-400 hover:text-blue-300 underline font-semibold">Short Numbers</Link></li>
              <li>• If you want to verify 1 service for a longer period, go to <Link to="/long" className="text-blue-400 hover:text-blue-300 underline font-semibold">Long Numbers</Link></li>
              <li>• If you want to verify more than 1 service with the same number, go to <Link to="/emptysimcard" className="text-blue-400 hover:text-blue-300 underline font-semibold">Empty SIM cards</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Middle Numbers, Area Code Configuration Announcement */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 mb-6">
        <p className="text-center text-sm">
          <span className="text-emerald-300 font-bold">NEW</span>
          <span className="text-slate-300 mx-2">—</span>
          <span className="text-slate-200">Now you can configure <span className="text-emerald-400 font-semibold">Middle Numbers</span> by choosing <span className="text-emerald-400 font-semibold">Area Code</span> and <Link to="/emptysimcard" className="text-emerald-400 font-semibold hover:text-emerald-300 underline">UK Empty SIM Cards</Link>!</span>
        </p>
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
                              <span className="text-emerald-400 font-semibold">Yes</span>
                            </div>
                          </div>
                          {/* Purchase Button - full width */}
                          <button
                            onClick={() => handlePurchaseClick(option)}
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
                          <span className="text-emerald-400 font-semibold">Yes</span>
                        </div>

                        <button
                          onClick={() => handlePurchaseClick(option)}
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
        )}
      </div>

      {/* Custom Number Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-slate-600/50">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-white text-center">Custom Number</h3>
            </div>

            {/* Area Code Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-emerald-300 mb-2">Area Code (Optional)</label>
              <div className="relative" ref={areaCodeDropdownRef}>
                <div
                  onClick={() => { setIsAreaCodeDropdownOpen(!isAreaCodeDropdownOpen); setAreaCodeSearchTerm(''); }}
                  className="w-full pl-4 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner flex items-center justify-between cursor-pointer hover:border-slate-500/50 transition-all duration-300"
                >
                  <span className={selectedAreaCode === 'Random' ? 'text-white' : 'text-white'}>
                    {selectedAreaCode === 'Random' ? 'Random' : `${selectedAreaCode} — ${areaCodeData.find(a => a.code === selectedAreaCode)?.state ?? ''}`}
                  </span>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className={`h-5 w-5 text-emerald-400 transition-transform duration-300 ${isAreaCodeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {isAreaCodeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-50 flex flex-col" style={{ maxHeight: '260px' }}>
                    {/* Search input */}
                    <div className="p-2 border-b border-slate-600/50 flex-shrink-0">
                      <input
                        type="text"
                        autoFocus
                        value={areaCodeSearchTerm}
                        onChange={(e) => setAreaCodeSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Search by code or state..."
                        className="w-full px-3 py-1.5 bg-slate-700/60 border border-slate-600/50 rounded-xl text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {/* Options list */}
                    <div className="overflow-y-auto flex-1">
                      {/* Random option - only show when service is in both opt4 and opt5 */}
                      {serviceAvailability.inOpt4 && serviceAvailability.inOpt5 && ('random'.includes(areaCodeSearchTerm.toLowerCase()) || areaCodeSearchTerm === '') && (
                        <div
                          onClick={() => { setSelectedAreaCode('Random'); setIsAreaCodeDropdownOpen(false); }}
                          className="flex items-center px-4 py-2.5 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl"
                        >
                          <span className="text-slate-300 text-sm">Random</span>
                        </div>
                      )}
                      {areaCodeData
                        .filter(a =>
                          a.code.includes(areaCodeSearchTerm) ||
                          a.state.toLowerCase().includes(areaCodeSearchTerm.toLowerCase())
                        )
                        .map((a) => (
                          <div
                            key={a.code}
                            onClick={() => { setSelectedAreaCode(a.code); setIsAreaCodeDropdownOpen(false); }}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 last:rounded-b-2xl"
                          >
                            <span className="text-white font-medium text-sm">{a.code}</span>
                            <span className="text-slate-400 text-xs">{a.state}</span>
                          </div>
                        ))
                      }
                      {areaCodeData.filter(a =>
                        a.code.includes(areaCodeSearchTerm) ||
                        a.state.toLowerCase().includes(areaCodeSearchTerm.toLowerCase())
                      ).length === 0 && !('random'.includes(areaCodeSearchTerm.toLowerCase())) && (
                          <div className="px-4 py-3 text-slate-400 text-sm text-center">No results found</div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowCustomModal(false); setPendingOption(null); }}
                className="flex-1 px-4 py-2 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/50 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomModalProceed}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 text-sm"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
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

export default Middle;