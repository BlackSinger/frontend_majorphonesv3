import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import countriesData from '../countries_export.json';
import countriesSimple from '../countries_simple.json';

const USA_AREA_CODES = new Set([
    '205', '251', '256', '334', '659', '938', '907', '480', '520', '602', '623', '928', '327', '479', '501', '870', '209', '213', '279', '310', '323', '341', '350', '408', '415', '424', '442', '510', '530', '559', '562', '619', '626', '628', '650', '657', '661', '669', '707', '714', '747', '760', '764', '805', '818', '820', '831', '840', '858', '909', '916', '925', '949', '951', '252', '336', '704', '743', '828', '910', '919', '980', '984', '803', '821', '839', '843', '854', '864', '303', '719', '720', '970', '983', '203', '475', '860', '959', '701', '605', '302', '239', '305', '321', '352', '386', '407', '448', '561', '645', '656', '689', '727', '754', '772', '786', '813', '850', '863', '904', '941', '954', '229', '404', '470', '478', '678', '706', '762', '770', '912', '943', '808', '208', '986', '217', '224', '309', '312', '331', '447', '464', '618', '630', '708', '730', '773', '779', '815', '847', '872', '219', '260', '317', '463', '574', '765', '812', '930', '319', '515', '563', '641', '712', '316', '620', '785', '913', '270', '364', '502', '606', '859', '225', '318', '337', '452', '504', '985', '207', '240', '301', '410', '443', '667', '339', '351', '413', '508', '617', '774', '781', '857', '978', '231', '248', '269', '313', '517', '586', '616', '734', '813', '810', '906', '947', '989', '218', '320', '507', '612', '651', '763', '952', '228', '601', '662', '769', '314', '417', '573', '636', '660', '816', '975', '406', '308', '402', '531', '702', '725', '775', '201', '551', '609', '640', '732', '848', '856', '862', '908', '973', '212', '315', '332', '347', '516', '518', '585', '607', '631', '646', '680', '716', '718', '838', '845', '914', '917', '929', '934', '603', '505', '575', '216', '234', '326', '330', '380', '419', '440', '513', '567', '614', '740', '937', '405', '539', '580', '918', '458', '503', '541', '971', '215', '223', '267', '272', '412', '445', '484', '570', '610', '717', '724', '814', '878', '401', '423', '615', '629', '731', '865', '901', '931', '210', '214', '254', '281', '325', '346', '361', '409', '430', '432', '469', '512', '682', '713', '726', '737', '806', '817', '830', '832', '903', '915', '936', '940', '956', '972', '979', '385', '435', '801', '802', '276', '434', '540', '571', '703', '757', '804', '826', '948', '206', '253', '360', '425', '509', '564', '202', '771', '304', '681', '262', '414', '534', '608', '715', '920', '307'
]);
const CANADA_AREA_CODES = new Set([
    '403', '587', '780', '825', '236', '250', '604', '672', '778', '204', '431', '506', '709', '782', '902', '226', '249', '289', '343', '365', '416', '437', '519', '548', '613', '647', '705', '753', '807', '905', '354', '367', '418', '438', '450', '514', '579', '581', '819', '873', '306', '639', '867'
]);
const CARIBBEAN_PREFIXES = [
    '242', '246', '264', '268', '284', '340', '345', '441', '473', '649',
    '664', '670', '671', '684', '758', '767', '784', '787', '809', '829',
    '849', '868', '869', '876', '939'
];
const KAZAKHSTAN_VALID_3DIGIT = ['700', '701', '702', '705', '707', '708', '747', '771', '775', '776', '777', '778'];
const KAZAKHSTAN_REJECT_2DIGIT = ['71', '72'];
const RUSSIA_REJECT_1DIGIT = ['3', '4', '5', '8'];
const ISLE_OF_MAN_PREFIXES = ['7524', '7624', '7924'];
const GUERNSEY_PREFIXES = ['7781', '7839', '7911'];
const JERSEY_PREFIXES = ['7509', '7700', '7797', '7829', '7937'];
const REUNION_PREFIXES = ['692', '693', '700'];
const MAYOTTE_PREFIXES = ['639'];
const REUNION_MAYOTTE_DISCARD_3 = ['262', '269'];
const ALAND_PREFIX_3 = '457';
const FINLAND_VALID_D1 = '4';
const FINLAND_VALID_D2 = '50';

const COUNTRY_ALIASES: { [key: string]: string } = {
    'usa': 'US',
    'us': 'US',
    'united states': 'US',
    'uk': 'GB',
    'united kingdom': 'GB',
    'england': 'GB',
    'great britain': 'GB',
    'britain': 'GB',
    'uae': 'AE',
    'united arab emirates': 'AE'
};

interface CountryData {
    id: string;
    country: string;
    isoCountry: string;
    areaCode: string;
    priceUnit: string;
    maxPrice: number;
}

const SendSMS: React.FC = () => {
    const [countries, setCountries] = useState<CountryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [countryFilter, setCountryFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [countryTags, setCountryTags] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<CountryData[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSendForm, setShowSendForm] = useState(false);
    const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
    const [phoneInput, setPhoneInput] = useState('');
    const [smsMessage, setSmsMessage] = useState('');
    const [smsCountryResults, setSmsCountryResults] = useState<CountryData[]>([]);
    const [smsSearching, setSmsSearching] = useState(false);
    const [pricesChecked, setPricesChecked] = useState(false);
    const [smsCurrentPage, setSmsCurrentPage] = useState(1);
    const [sending, setSending] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDirectSuccessModal, setShowDirectSuccessModal] = useState(false);
    const [errorModalTitle, setErrorModalTitle] = useState('Error');
    const [errorModalBody, setErrorModalBody] = useState('');
    const [failedNumbers, setFailedNumbers] = useState<string[]>([]);
    const [showPartialSuccessModal, setShowPartialSuccessModal] = useState(false);
    const itemsPerPage = 10;

    const navigate = useNavigate();

    useEffect(() => {
        const loadCountries = () => {
            setLoading(true);
            try {
                const formatted: CountryData[] = countriesData.map((item: any) => ({
                    id: item.id,
                    country: item.country,
                    isoCountry: item.isoCountry,
                    areaCode: item.areaCode,
                    priceUnit: item.priceUnit,
                    maxPrice: item.maxPrice
                }));

                formatted.sort((a, b) => a.country.localeCompare(b.country));
                setCountries(formatted);
            } catch (err) {
                setError('An error occurred when loading the data');
                setShowErrorModal(true);
            } finally {
                setLoading(false);
            }
        };

        loadCountries();
    }, []);

    useEffect(() => {
        if (searchResults.length > 0) {
            setSearchResults([]);
        }
    }, [countryTags, countryFilter]);

    const handleSearchCountry = async () => {
        if (countryTags.length === 0) return;

        const notFound: string[] = [];
        const matches: { tag: string; isoCountry: string }[] = [];

        for (const tag of countryTags) {
            const cleanTag = tag.toLowerCase().trim();

            const aliasIso = COUNTRY_ALIASES[cleanTag];
            if (aliasIso) {
                matches.push({ tag, isoCountry: aliasIso });
                continue;
            }

            const exactMatch = countriesSimple.find(
                (c: any) => c.country.toLowerCase() === cleanTag || c.isoCountry.toLowerCase() === cleanTag
            );

            if (exactMatch) {
                matches.push({ tag, isoCountry: exactMatch.isoCountry });
            } else {
                const allStartMatch = countriesSimple.filter(
                    (c: any) => c.country.toLowerCase().startsWith(cleanTag)
                );

                if (allStartMatch.length > 0) {
                    allStartMatch.forEach(m => {
                        matches.push({ tag, isoCountry: m.isoCountry });
                    });
                } else {
                    notFound.push(tag);
                }
            }
        }

        if (notFound.length > 0) {
            setError(`One or more countries weren't found, please check the spelling and try again`);
            setShowErrorModal(true);
            return;
        }

        setSearching(true);
        try {
            const results: CountryData[] = [];

            const uniqueIsoCodes = Array.from(new Set(matches.map(m => m.isoCountry)));
            for (const isoCountry of uniqueIsoCodes) {
                const docRef = doc(db, 'sendSMS', 'opt1', 'countries', isoCountry);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    results.push({
                        id: docSnap.id,
                        country: data.country,
                        isoCountry: data.isoCountry,
                        areaCode: data.areaCode,
                        priceUnit: data.priceUnit,
                        maxPrice: data.maxPrice
                    });
                }
            }
            setSearchResults(results);
        } catch (err) {
            setError('An error occurred while searching. Please try again.');
            setShowErrorModal(true);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && countryFilter.trim()) {
            e.preventDefault();
            const newTag = countryFilter.trim();
            if (!countryTags.some(tag => tag.toLowerCase() === newTag.toLowerCase())) {
                setCountryTags([...countryTags, newTag]);
            }
            setCountryFilter('');
            setSearchResults([]);
        }
    };

    const removeTag = (tagToRemove: string) => {
        setCountryTags(countryTags.filter(tag => tag !== tagToRemove));
        setSearchResults([]);
    };

    const detectCountriesFromNumbers = async (numbers: string[]) => {
        if (numbers.length === 0) {
            setSmsCountryResults([]);
            return;
        }

        const cleanNumbers = numbers.map(n => n.replace(/[^0-9]/g, ''));

        const sortedCountries = [...countriesData].sort((a, b) =>
            b.areaCode.length - a.areaCode.length
        );

        const matchedIsoCodes = new Set<string>();

        for (const num of cleanNumbers) {
            for (const country of sortedCountries) {
                if (num.startsWith(country.areaCode)) {

                    if (country.areaCode === '1') {
                        const next3 = num.substring(1, 4);

                        if (next3 === '939') break;

                        if (CANADA_AREA_CODES.has(next3)) {
                            matchedIsoCodes.add('CA');
                        } else if (USA_AREA_CODES.has(next3)) {
                            matchedIsoCodes.add('US');
                        } else {
                            matchedIsoCodes.add('US');
                        }
                    }

                    else if (country.areaCode === '7') {
                        const next1 = num.charAt(1);
                        const next2 = num.substring(1, 3);
                        const next3 = num.substring(1, 4);

                        if (next1 === '9') {
                            matchedIsoCodes.add('RU');
                        } else if (RUSSIA_REJECT_1DIGIT.includes(next1)) {
                            break;
                        }

                        else if (KAZAKHSTAN_VALID_3DIGIT.includes(next3)) {
                            matchedIsoCodes.add('KZ');
                        } else if (KAZAKHSTAN_REJECT_2DIGIT.includes(next2)) {
                            break;
                        }

                        else if (next1 === '6') {
                            matchedIsoCodes.add('KZ');
                        }

                        else {
                            break;
                        }
                    }
                    else if (country.areaCode === '44') {
                        const next1 = num.charAt(2);
                        const next2 = num.substring(2, 4);
                        const next4 = num.substring(2, 6);

                        if (['1', '2', '3', '5', '8'].includes(next1)) break;

                        if (next2 === '70') break;

                        if (next2 === '76' && next4 !== '7624') break;

                        if (ISLE_OF_MAN_PREFIXES.some(p => next4.startsWith(p))) {
                            matchedIsoCodes.add('IM');
                        } else if (GUERNSEY_PREFIXES.some(p => next4.startsWith(p))) {
                            matchedIsoCodes.add('GG');
                        } else if (JERSEY_PREFIXES.some(p => next4.startsWith(p))) {
                            matchedIsoCodes.add('JE');
                        } else {
                            matchedIsoCodes.add('GB');
                        }
                    }
                    else if (country.areaCode === '47') {
                        const next1 = num.charAt(2);
                        const next2 = num.substring(2, 4);

                        if (['2', '3', '5', '6', '8'].includes(next1)) break;
                        if (next2 === '79') break;
                        matchedIsoCodes.add('NO');
                    }
                    else if (country.areaCode === '61') {
                        const next1 = num.charAt(2);

                        if (['4', '5'].includes(next1)) {
                            matchedIsoCodes.add('AU');
                        } else {
                            break;
                        }
                    }
                    else if (country.areaCode === '212') {
                        const next1 = num.charAt(3);

                        if (['6', '7'].includes(next1)) {
                            matchedIsoCodes.add('MA');
                        } else {
                            break;
                        }
                    }
                    else if (country.areaCode === '262') {
                        const next1 = num.charAt(3);
                        const next3 = num.substring(3, 6);
                        if (REUNION_MAYOTTE_DISCARD_3.includes(next3) || next1 === '8') break;

                        if (MAYOTTE_PREFIXES.includes(next3)) {
                            matchedIsoCodes.add('YT');
                        } else if (REUNION_PREFIXES.includes(next3)) {
                            matchedIsoCodes.add('RE');
                        } else {
                            break;
                        }
                    }
                    else if (country.areaCode === '358') {
                        const next1 = num.charAt(3);
                        const next2 = num.substring(3, 5);
                        const next3 = num.substring(3, 6);
                        if (next3 === ALAND_PREFIX_3) {
                            matchedIsoCodes.add('AX');
                        }
                        else if (next1 === FINLAND_VALID_D1 || next2 === FINLAND_VALID_D2) {
                            matchedIsoCodes.add('FI');
                        }
                        else {
                            break;
                        }
                    }
                    else if (country.areaCode === '672') {
                        const next2 = num.substring(3, 5);
                        if (next2 === '38') {
                            matchedIsoCodes.add('NF');
                        } else {
                            break;
                        }
                    }

                    else {
                        matchedIsoCodes.add(country.isoCountry);
                    }

                    break;
                }
            }
        }

        if (matchedIsoCodes.size === 0) {
            setSmsCountryResults([]);
            return;
        }

        setSmsSearching(true);
        try {
            const results: CountryData[] = [];
            for (const isoCode of Array.from(matchedIsoCodes)) {
                const docRef = doc(db, 'sendSMS', 'opt1', 'countries', isoCode);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    results.push({
                        id: docSnap.id,
                        country: data.country,
                        isoCountry: data.isoCountry,
                        areaCode: data.areaCode,
                        priceUnit: data.priceUnit,
                        maxPrice: data.maxPrice
                    });
                }
            }
            setSmsCountryResults(results);
        } catch (err) {
            setError('An error occurred while fetching prices.');
            setShowErrorModal(true);
            setSmsCountryResults([]);
        } finally {
            setSmsSearching(false);
        }
    };

    const smsTotalPages = Math.ceil(smsCountryResults.length / itemsPerPage);
    const smsStartIndex = (smsCurrentPage - 1) * itemsPerPage;
    const smsEndIndex = smsStartIndex + itemsPerPage;
    const smsPaginatedResults = useMemo(() => {
        return smsCountryResults.slice(smsStartIndex, smsEndIndex);
    }, [smsCountryResults, smsStartIndex, smsEndIndex]);

    const handleCheckPrices = async () => {
        setSmsCurrentPage(1);
        const validOnly = phoneNumbers.filter(isNumberValid);
        if (validOnly.length > 0) {
            await detectCountriesFromNumbers(validOnly);
            setPricesChecked(true);
        }
    };

    const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && phoneInput.trim()) {
            e.preventDefault();

            const newNumber = phoneInput.trim();

            if (!/^\d+$/.test(newNumber)) {
                return;
            }

            if (!phoneNumbers.includes(newNumber)) {
                const updatedNumbers = [...phoneNumbers, newNumber];
                setPhoneNumbers(updatedNumbers);
                setPricesChecked(false);
            }
            setPhoneInput('');
        }
    };

    const removePhoneNumber = (numberToRemove: string) => {
        const updatedNumbers = phoneNumbers.filter(n => n !== numberToRemove);
        setPhoneNumbers(updatedNumbers);
        setPricesChecked(false);
    };

    const calculateTotalPrice = (): number => {
        let total = 0;
        const cleanNumbers = phoneNumbers.map(n => n.replace(/[^0-9]/g, ''));

        for (const num of cleanNumbers) {
            for (const result of smsCountryResults) {
                let matches = false;

                if (result.areaCode === '1') {
                    const next3 = num.substring(1, 4);
                    const isCanada = CANADA_AREA_CODES.has(next3);
                    const isCaribbean = CARIBBEAN_PREFIXES.includes(next3);

                    if (result.isoCountry === 'CA' && isCanada) matches = true;
                    else if (result.isoCountry === 'US' && !isCanada && !isCaribbean && num.startsWith('1')) matches = true;
                    else if (result.isoCountry === 'PR' && (next3 === '787' || next3 === '939')) matches = true;
                } else if (result.areaCode === '7') {
                    const next1 = num.charAt(1);
                    const next3 = num.substring(1, 4);
                    if (result.isoCountry === 'RU' && next1 === '9') matches = true;
                    else if (result.isoCountry === 'KZ' && (next1 === '6' || KAZAKHSTAN_VALID_3DIGIT.includes(next3))) matches = true;
                } else if (result.areaCode === '44') {
                    const next4 = num.substring(2, 6);
                    if (result.isoCountry === 'IM' && ISLE_OF_MAN_PREFIXES.some(p => next4.startsWith(p))) matches = true;
                    else if (result.isoCountry === 'GG' && GUERNSEY_PREFIXES.some(p => next4.startsWith(p))) matches = true;
                    else if (result.isoCountry === 'JE' && JERSEY_PREFIXES.some(p => next4.startsWith(p))) matches = true;
                    else if (result.isoCountry === 'GB') {
                        const next1 = num.charAt(2);
                        const next2 = num.substring(2, 4);
                        const isIsland = ISLE_OF_MAN_PREFIXES.some(p => next4.startsWith(p)) ||
                            GUERNSEY_PREFIXES.some(p => next4.startsWith(p)) ||
                            JERSEY_PREFIXES.some(p => next4.startsWith(p));
                        if (!isIsland && !['1', '2', '3', '5', '8'].includes(next1) && next2 !== '70') matches = true;
                    }
                } else if (result.areaCode === '47') {
                    const next1 = num.charAt(2);
                    const next2 = num.substring(2, 4);
                    if (!['2', '3', '5', '6', '8'].includes(next1) && next2 !== '79') matches = true;
                } else if (result.areaCode === '61') {
                    if (['4', '5'].includes(num.charAt(2))) matches = true;
                } else if (result.areaCode === '212') {
                    if (['6', '7'].includes(num.charAt(3))) matches = true;
                } else if (result.areaCode === '262') {
                    const next3 = num.substring(3, 6);
                    if (result.isoCountry === 'YT' && MAYOTTE_PREFIXES.includes(next3)) matches = true;
                    else if (result.isoCountry === 'RE' && REUNION_PREFIXES.includes(next3)) matches = true;
                } else if (result.areaCode === '358') {
                    const next3 = num.substring(3, 6);
                    const next1 = num.charAt(3);
                    const next2 = num.substring(3, 5);
                    if (result.isoCountry === 'AX' && next3 === ALAND_PREFIX_3) matches = true;
                    else if (result.isoCountry === 'FI' && next3 !== ALAND_PREFIX_3 && (next1 === FINLAND_VALID_D1 || next2 === FINLAND_VALID_D2)) matches = true;
                } else if (result.areaCode === '672') {
                    if (result.isoCountry === 'NF' && num.substring(3, 5) === '38') matches = true;
                } else if (num.startsWith(result.areaCode)) {
                    matches = true;
                }

                if (matches) {
                    total += result.maxPrice;
                    break;
                }
            }
        }
        return total;
    };

    const getFlagEmoji = (isoCode: string): React.ReactElement => {
        if (!isoCode || isoCode.trim().length !== 2) {
            return <span className="text-2xl">🏳️</span>;
        }

        const cleanCode = isoCode.trim().toLowerCase();

        return (
            <img
                src={`https://flagcdn.com/w40/${cleanCode}.png`}
                alt={`${isoCode} flag`}
                className="w-6 h-5 object-cover rounded shadow-sm"
            />
        );
    };

    const filteredCountries = useMemo(() => {
        return countries;
    }, [countries]);
    const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCountries = filteredCountries.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [countryFilter]);

    const BLOCKED_AREA_CODES = ['93', '994', '880', '992', '216', '234', '213', '92', '972'];

    const isNumberValid = (num: string) => {
        const clean = num.replace(/[^0-9]/g, '');
        if (clean.length === 0 || clean.startsWith('0')) return false;

        if (BLOCKED_AREA_CODES.some(code => clean.startsWith(code))) return false;

        const sortedCountries = [...countriesData].sort((a, b) => b.areaCode.length - a.areaCode.length);

        for (const country of sortedCountries) {
            if (clean.startsWith(country.areaCode)) {
                if (country.areaCode === '1') {
                    const next3 = clean.substring(1, 4);
                    if (next3 === '939') return false;
                    return true;
                }

                if (country.areaCode === '7') {
                    const next1 = clean.charAt(1);
                    const next3 = clean.substring(1, 4);
                    return next1 === '9' || next1 === '6' || KAZAKHSTAN_VALID_3DIGIT.includes(next3);
                }

                if (country.areaCode === '44') {
                    const next1 = clean.charAt(2);
                    const next2 = clean.substring(2, 4);
                    const next4 = clean.substring(2, 6);
                    if (['1', '2', '3', '5', '8'].includes(next1)) return false;
                    if (next2 === '70') return false;
                    if (next2 === '76' && next4 !== '7624') return false;
                    return true;
                }

                if (country.areaCode === '47') {
                    const next1 = clean.charAt(2);
                    const next2 = clean.substring(2, 4);
                    if (['2', '3', '5', '6', '8'].includes(next1) || next2 === '79') return false;
                    return true;
                }

                if (country.areaCode === '61') {
                    const next1 = clean.charAt(2);
                    return ['4', '5'].includes(next1);
                }

                if (country.areaCode === '212') {
                    const next1 = clean.charAt(3);
                    return ['6', '7'].includes(next1);
                }

                if (country.areaCode === '262') {
                    const next1 = clean.charAt(3);
                    const next3 = clean.substring(3, 6);
                    if (REUNION_MAYOTTE_DISCARD_3.includes(next3) || next1 === '8') return false;
                    return MAYOTTE_PREFIXES.includes(next3) || REUNION_PREFIXES.includes(next3);
                }

                if (country.areaCode === '358') {
                    const next1 = clean.charAt(3);
                    const next2 = clean.substring(3, 5);
                    const next3 = clean.substring(3, 6);
                    return next3 === ALAND_PREFIX_3 || next1 === FINLAND_VALID_D1 || next2 === FINLAND_VALID_D2;
                }

                if (country.areaCode === '672') {
                    return clean.substring(3, 5) === '38';
                }

                return true;
            }
        }
        return false;
    };

    const handleSendSMS = async () => {
        if (!auth.currentUser) {
            setErrorModalTitle('Error');
            setErrorModalBody('You are not authenticated or your token is invalid');
            setShowErrorModal(true);
            return;
        }

        const hasBlockedNumbers = phoneNumbers.some(num => {
            const clean = num.replace(/[^0-9]/g, '');
            return BLOCKED_AREA_CODES.some(code => clean.startsWith(code));
        });

        if (hasBlockedNumbers) {
            setErrorModalTitle('SMS not sent');
            setErrorModalBody('1 or more phone numbers are not allowed');
            setShowErrorModal(true);
            return;
        }

        setSending(true);

        try {
            const idToken = await auth.currentUser.getIdToken();

            const payload = {
                numbers: phoneNumbers.map(n => n.replace('+', '')),
                message: smsMessage,
                countries: phoneNumbers.map(num => {
                    const clean = num.replace(/[^0-9]/g, '');
                    let detectedCountry = 'Unknown';

                    for (const result of smsCountryResults) {
                        let matches = false;

                        if (result.areaCode === '1') {
                            const next3 = clean.substring(1, 4);
                            const isCanada = CANADA_AREA_CODES.has(next3);
                            const isCaribbean = CARIBBEAN_PREFIXES.includes(next3);
                            if (result.isoCountry === 'CA' && isCanada) matches = true;
                            else if (result.isoCountry === 'US' && !isCanada && !isCaribbean && clean.startsWith('1')) matches = true;
                            else if (result.isoCountry === 'PR' && (next3 === '787' || next3 === '939')) matches = true;
                        } else if (result.areaCode === '7') {
                            const next1 = clean.charAt(1);
                            const next3 = clean.substring(1, 4);
                            if (result.isoCountry === 'RU' && next1 === '9') matches = true;
                            else if (result.isoCountry === 'KZ' && (next1 === '6' || KAZAKHSTAN_VALID_3DIGIT.includes(next3))) matches = true;
                        } else if (result.areaCode === '44') {
                            const next4 = clean.substring(2, 6);
                            if (result.isoCountry === 'IM' && ISLE_OF_MAN_PREFIXES.some(p => next4.startsWith(p))) matches = true;
                            else if (result.isoCountry === 'GG' && GUERNSEY_PREFIXES.some(p => next4.startsWith(p))) matches = true;
                            else if (result.isoCountry === 'JE' && JERSEY_PREFIXES.some(p => next4.startsWith(p))) matches = true;
                            else if (result.isoCountry === 'GB') {
                                const next1 = clean.charAt(2);
                                const next2 = clean.substring(2, 4);
                                const isIsland = ISLE_OF_MAN_PREFIXES.some(p => next4.startsWith(p)) ||
                                    GUERNSEY_PREFIXES.some(p => next4.startsWith(p)) ||
                                    JERSEY_PREFIXES.some(p => next4.startsWith(p));
                                if (!isIsland && !['1', '2', '3', '5', '8'].includes(next1) && next2 !== '70') matches = true;
                            }
                        } else if (result.areaCode === '47') {
                            const next1 = clean.charAt(2);
                            const next2 = clean.substring(2, 4);
                            if (!['2', '3', '5', '6', '8'].includes(next1) && next2 !== '79') matches = true;
                        } else if (result.areaCode === '61') {
                            if (['4', '5'].includes(clean.charAt(2))) matches = true;
                        } else if (result.areaCode === '212') {
                            if (['6', '7'].includes(clean.charAt(3))) matches = true;
                        } else if (result.areaCode === '262') {
                            const next3 = clean.substring(3, 6);
                            if (result.isoCountry === 'YT' && MAYOTTE_PREFIXES.includes(next3)) matches = true;
                            else if (result.isoCountry === 'RE' && REUNION_PREFIXES.includes(next3)) matches = true;
                        } else if (result.areaCode === '358') {
                            const next3 = clean.substring(3, 6);
                            const next1 = clean.charAt(3);
                            const next2 = clean.substring(3, 5);
                            if (result.isoCountry === 'AX' && next3 === ALAND_PREFIX_3) matches = true;
                            else if (result.isoCountry === 'FI' && next3 !== ALAND_PREFIX_3 && (next1 === FINLAND_VALID_D1 || next2 === FINLAND_VALID_D2)) matches = true;
                        } else if (result.areaCode === '672') {
                            if (result.isoCountry === 'NF' && clean.substring(3, 5) === '38') matches = true;
                        } else if (clean.startsWith(result.areaCode)) {
                            matches = true;
                        }

                        if (matches) {
                            detectedCountry = result.country;
                            break;
                        }
                    }
                    return detectedCountry;
                })
            };

            const response = await fetch('https://sendsms-ezeznlhr5a-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'authorization': idToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data: any = await response.json();

            if (response.ok) {
                setSending(false);

                if (data.failedNumbers && Array.isArray(data.failedNumbers) && data.failedNumbers.length > 0) {
                    setFailedNumbers(data.failedNumbers);
                    setShowPartialSuccessModal(true);
                } else if (data.orderIds || data.messageQueued) {
                    // Moderation response
                    setShowSuccessModal(true);
                } else {
                    // Direct success response
                    setShowDirectSuccessModal(true);
                }
            } else {
                setSending(false);

                if (response.status === 400) {
                    if (data.error === 'Missing parameters') {
                        setErrorModalTitle('Error');
                        setErrorModalBody('Please refresh the page and try again');
                    } else if (data.error === 'Unauthorized') {
                        setErrorModalTitle('SMS not sent');
                        setErrorModalBody('You cannot proceed with this action');
                    } else if (data.error === 'User not found') {
                        setErrorModalTitle('SMS not sent');
                        setErrorModalBody('You cannot proceed with this action');
                    } else if (data.error === 'Numbers and countries arrays must have the same length') {
                        setErrorModalTitle('SMS not sent');
                        setErrorModalBody('Please contact our customer support');
                    } else if (data.error === 'One or more countries are not supported') {
                        setErrorModalTitle('SMS not sent');
                        setErrorModalBody('One or more countries are banned');
                    } else if (data.error === 'Message flagged for moderation') {
                        setErrorModalTitle('SMS not sent');
                        setErrorModalBody('Your message has been flagged for moderation');
                    } else if (data.error === 'Country not found') {
                        setErrorModalTitle('SMS not sent');
                        setErrorModalBody('One or more numbers don\'t belong to the allowed countries');
                    } else if (data.error === 'Insufficient balance') {
                        setErrorModalTitle('Insufficient balance');
                        setErrorModalBody('Your message cannot be sent, please recharge your account');
                    } else {
                        setErrorModalTitle('Error');
                        setErrorModalBody(data.error || 'An error occurred');
                    }
                } else if (response.status === 500) {
                    setErrorModalTitle('Internal Error');
                    setErrorModalBody('Please contact our customer support');
                } else {
                    setErrorModalTitle('Error');
                    setErrorModalBody('An unexpected error occurred');
                }
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error(error);
            setSending(false);
            setErrorModalTitle('Internal Error');
            setErrorModalBody('Please contact our customer support');
            setShowErrorModal(true);
        }
    };

    return (
        <>
            <style>{`
            .dashboard-scrollbar::-webkit-scrollbar {
                width: 8px;
            }
            .dashboard-scrollbar::-webkit-scrollbar-track {
                background: rgba(30, 41, 59, 0.3);
                border-radius: 10px;
            }
            .dashboard-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(71, 85, 105, 0.6);
                border-radius: 10px;
            }
            .dashboard-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(71, 85, 105, 0.8);
            }
        `}</style>

            <div className="space-y-6">
                {/* Header */}
                <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center space-x-4">
                            <div>
                                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                                    Send message
                                </h1>
                                <p className="text-slate-300 text-md text-left">Send SMS to multiple numbers worldwide</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Information Section*/}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-blue-300 text-sm font-semibold mb-3">Important information about this service:</p>
                            <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                                <li>• Send messages to any number worldwide</li>
                                <li>• Price per SMS depends on the destination country, please check the price table below</li>
                                <li>• Sent messages are non-refundable</li>
                                <li>• Once a message has been sent, it cannot be cancelled or retracted</li>
                                <li>• You can only send text messages, no images, MMS, voice notes, or videos are allowed</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Price Table Section */}
                {!showSendForm && (
                    <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                        <div className="relative z-10">
                            {/* Filters */}
                            <div className={`${!(loading || searching) ? 'mb-6' : ''} space-y-4`}>
                                {/* Country Search Input with Tags */}
                                <div>
                                    <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                                        Enter country names to check prices
                                    </label>
                                    <div
                                        className={`flex flex-wrap items-center gap-2 w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl shadow-inner hover:border-slate-500/50 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500/50 transition-all duration-300 min-h-[48px] max-h-[120px] overflow-y-auto dashboard-scrollbar ${searching ? 'pointer-events-none opacity-60' : ''}`}
                                        style={{
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: 'rgba(71, 85, 105, 0.6) rgba(30, 41, 59, 0.3)'
                                        }}
                                    >
                                        {countryTags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-sm font-medium whitespace-nowrap"
                                            >
                                                {tag}
                                                <button
                                                    onClick={() => removeTag(tag)}
                                                    className="ml-0.5 text-emerald-400 hover:text-red-400 transition-colors duration-200"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        ))}
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            if (countryFilter.trim()) {
                                                const newTag = countryFilter.trim();
                                                if (!countryTags.some(tag => tag.toLowerCase() === newTag.toLowerCase())) {
                                                    setCountryTags([...countryTags, newTag]);
                                                }
                                                setCountryFilter('');
                                                setSearchResults([]);
                                            }
                                        }} className="flex-1 min-w-[150px]">
                                            <input
                                                type="text"
                                                value={countryFilter}
                                                onChange={(e) => setCountryFilter(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder={"Type country name and press Enter..."}
                                                className="w-full bg-transparent text-white text-sm outline-none placeholder-slate-400"
                                            />
                                        </form>

                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleSearchCountry}
                                        disabled={searchResults.length > 0 || searching || countryTags.length === 0 || countryFilter.trim() !== ''}
                                        className="group flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 hover:scale-[1.02] border border-blue-500/30 hover:border-blue-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative z-10 flex items-center justify-center">
                                            <span className="group-hover:tracking-wide transition-all duration-300">
                                                Search country
                                            </span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setShowSendForm(true)}
                                        disabled={searching}
                                        className="group flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-[1.02] border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative z-10 flex items-center justify-center">
                                            <span className="group-hover:tracking-wide transition-all duration-300">
                                                Send SMS
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Table Container */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                {!(loading || searching) && "Country"}
                                            </th>

                                            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                {!(loading || searching) && "Area Code"}
                                            </th>

                                            {searchResults.length > 0 && !searching && (
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                    Price per SMS
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading || searching ? (
                                            <tr>
                                                <td colSpan={searchResults.length > 0 ? 3 : 2} className="px-6 py-20">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        <p className="text-slate-400 mt-4">{searching ? 'Searching...' : 'Loading info...'}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : searchResults.length > 0 ? (
                                            searchResults.map((result) => (
                                                <tr key={result.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors duration-200">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-3">
                                                            {getFlagEmoji(result.isoCountry)}
                                                            <span className="text-white">{result.country}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-slate-300">+{result.areaCode}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-emerald-400 font-semibold">
                                                            ${result.maxPrice.toFixed(2)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : countries.length === 0 ? (
                                            <tr>
                                                <td colSpan={searchResults.length > 0 ? 3 : 2} className="px-6 py-20 text-center">
                                                    <p className="text-slate-400 text-lg">No countries available</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedCountries.map((country) => (
                                                <tr
                                                    key={country.id}
                                                    className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors duration-200"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-3">
                                                            {getFlagEmoji(country.isoCountry)}
                                                            <span className="text-white">{country.country}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-slate-300">+{country.areaCode}</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {searchResults.length === 0 && !searching && filteredCountries.length > 0 && totalPages > 1 && (
                                <div className="mt-6">
                                    <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredCountries.length)} of {filteredCountries.length} results
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="hidden md:block text-sm text-slate-400">
                                            Showing {startIndex + 1} to {Math.min(endIndex, filteredCountries.length)} of {filteredCountries.length} results
                                        </div>

                                        <div className="flex items-center space-x-2 mx-auto md:mx-0">
                                            {/* Previous Button */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>

                                            {/* Page Numbers */}
                                            <div className="flex space-x-1">
                                                {[currentPage, currentPage + 1].filter(page => page <= totalPages).map((page) => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentPage === page
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-slate-800/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Next Button */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Send SMS Form */}
                {showSendForm && (
                    <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                        <div className="relative z-10 space-y-6">

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
                                        Back to price table
                                    </span>
                                </button>
                            </div>

                            {/* Phone Numbers Input */}
                            <div>
                                <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                                    Recipient phone numbers
                                </label>
                                <div
                                    className={`flex flex-wrap items-center gap-2 w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl shadow-inner hover:border-slate-500/50 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500/50 transition-all duration-300 min-h-[48px] max-h-[120px] overflow-y-auto dashboard-scrollbar ${smsSearching || sending ? 'pointer-events-none opacity-60' : ''}`}
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: 'rgba(71, 85, 105, 0.6) rgba(30, 41, 59, 0.3)'
                                    }}
                                >
                                    {phoneNumbers.map((number, index) => {
                                        const valid = isNumberValid(number);
                                        return (
                                            <span
                                                key={index}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors duration-300 ${valid
                                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                                    : 'bg-red-500/20 border-red-500/40 text-red-300'
                                                    }`}
                                            >
                                                {number}
                                                <button
                                                    onClick={() => removePhoneNumber(number)}
                                                    disabled={sending}
                                                    className={`ml-0.5 transition-colors duration-200 ${valid ? 'text-emerald-400' : 'text-red-400'} hover:text-red-400 ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        );
                                    })}
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        if (phoneInput.trim()) {
                                            const newNumber = phoneInput.trim();
                                            if (!/^\d+$/.test(newNumber)) return;
                                            if (!phoneNumbers.includes(newNumber)) {
                                                const updatedNumbers = [...phoneNumbers, newNumber];
                                                setPhoneNumbers(updatedNumbers);
                                                setPricesChecked(false);
                                            }
                                            setPhoneInput('');
                                        }
                                    }} className="flex-1 min-w-[150px]">
                                        <input
                                            disabled={sending}
                                            type="text"
                                            value={phoneInput}
                                            onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, ''))}
                                            onKeyDown={handlePhoneKeyDown}
                                            placeholder="Type phone number with area code and press Enter..."
                                            className="w-full bg-transparent text-white text-sm outline-none placeholder-slate-400"
                                        />
                                    </form>

                                </div>

                                {phoneNumbers.some(n => !isNumberValid(n)) && (
                                    <p className="text-red-400 text-xs mt-3 font-medium">
                                        {phoneNumbers.some(num => BLOCKED_AREA_CODES.some(code => num.replace(/[^0-9]/g, '').startsWith(code)))
                                            ? '1 or more phone numbers are not allowed'
                                            : 'No countries detected from 1 or more phone numbers'
                                        }
                                    </p>
                                )}
                            </div>



                            {/* Message Textarea */}
                            <div>
                                <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                                    Message ({smsMessage.length}/160)
                                </label>
                                <textarea
                                    disabled={sending}
                                    value={smsMessage}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 160) {
                                            setSmsMessage(e.target.value);
                                        }
                                    }}
                                    maxLength={160}
                                    rows={4}
                                    placeholder="Type your message here..."
                                    className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-400 resize-none dashboard-scrollbar disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: 'rgba(71, 85, 105, 0.6) rgba(30, 41, 59, 0.3)'
                                    }}
                                />

                                {/* Check Price */}
                                {(!pricesChecked && phoneNumbers.some(n => isNumberValid(n))) && (
                                    <div className="flex justify-center mt-4">
                                        <button
                                            onClick={handleCheckPrices}
                                            disabled={smsSearching}
                                            className="group px-6 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-[1.02] border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[140px]"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            <div className="relative z-10 flex items-center justify-center">
                                                {smsSearching ? (
                                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <span className="group-hover:tracking-wide transition-all duration-300">
                                                        Check Price
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Price Table */}
                            {(pricesChecked && !smsSearching && smsCountryResults.length > 0) && (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-700">
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Country</th>
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Area Code</th>
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Price per SMS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {smsCountryResults.length > 0 ? (
                                                smsPaginatedResults.map((result) => {
                                                    const count = phoneNumbers.filter(n => {
                                                        const clean = n.replace(/[^0-9]/g, '');

                                                        if (result.areaCode === '1') {
                                                            const next3 = clean.substring(1, 4);
                                                            const isCanada = CANADA_AREA_CODES.has(next3);
                                                            const isCaribbean = CARIBBEAN_PREFIXES.includes(next3);
                                                            if (result.isoCountry === 'CA') return isCanada;
                                                            if (result.isoCountry === 'US') {
                                                                return clean.startsWith('1') && !isCanada && !isCaribbean;
                                                            }
                                                            if (result.isoCountry === 'PR') return next3 === '787' || next3 === '939';
                                                        } else if (result.areaCode === '7') {
                                                            const next1 = clean.charAt(1);
                                                            const next3 = clean.substring(1, 4);
                                                            if (result.isoCountry === 'RU') return next1 === '9';
                                                            if (result.isoCountry === 'KZ') return next1 === '6' || KAZAKHSTAN_VALID_3DIGIT.includes(next3);
                                                        } else if (result.areaCode === '44') {
                                                            const next4 = clean.substring(2, 6);
                                                            if (result.isoCountry === 'IM') return ISLE_OF_MAN_PREFIXES.some(p => next4.startsWith(p));
                                                            if (result.isoCountry === 'GG') return GUERNSEY_PREFIXES.some(p => next4.startsWith(p));
                                                            if (result.isoCountry === 'JE') return JERSEY_PREFIXES.some(p => next4.startsWith(p));
                                                            if (result.isoCountry === 'GB') {
                                                                const next1 = clean.charAt(2);
                                                                const next2 = clean.substring(2, 4);
                                                                const isIsland = ISLE_OF_MAN_PREFIXES.some(p => next4.startsWith(p)) ||
                                                                    GUERNSEY_PREFIXES.some(p => next4.startsWith(p)) ||
                                                                    JERSEY_PREFIXES.some(p => next4.startsWith(p));
                                                                return !isIsland && !['1', '2', '3', '5', '8'].includes(next1) && next2 !== '70';
                                                            }
                                                        } else if (result.areaCode === '47') {
                                                            const next1 = clean.charAt(2);
                                                            const next2 = clean.substring(2, 4);
                                                            if (result.isoCountry === 'NO') return !['2', '3', '5', '6', '8'].includes(next1) && next2 !== '79';
                                                        } else if (result.areaCode === '61') {
                                                            const next1 = clean.charAt(2);
                                                            if (result.isoCountry === 'AU') return ['4', '5'].includes(next1);
                                                        } else if (result.areaCode === '212') {
                                                            const next1 = clean.charAt(3);
                                                            if (result.isoCountry === 'MA') return ['6', '7'].includes(next1);
                                                        } else if (result.areaCode === '262') {
                                                            const next3 = clean.substring(3, 6);
                                                            if (result.isoCountry === 'YT') return MAYOTTE_PREFIXES.includes(next3);
                                                            if (result.isoCountry === 'RE') return REUNION_PREFIXES.includes(next3);
                                                        } else if (result.areaCode === '358') {
                                                            const next3 = clean.substring(3, 6);
                                                            const next1 = clean.charAt(3);
                                                            const next2 = clean.substring(3, 5);
                                                            if (result.isoCountry === 'AX') return next3 === ALAND_PREFIX_3;
                                                            if (result.isoCountry === 'FI') return next3 !== ALAND_PREFIX_3 && (next1 === FINLAND_VALID_D1 || next2 === FINLAND_VALID_D2);
                                                        } else if (result.areaCode === '672') {
                                                            if (result.isoCountry === 'NF') return clean.substring(3, 5) === '38';
                                                        }
                                                        return clean.startsWith(result.areaCode);
                                                    }).length;

                                                    return (
                                                        <tr key={result.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                                            <td className="px-6 py-4 text-left">
                                                                <div className="flex items-center justify-start gap-3">
                                                                    {getFlagEmoji(result.isoCountry)}
                                                                    <span className="text-sm font-medium text-white">{result.country} ({count})</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="text-slate-300">+{result.areaCode}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="text-emerald-400 font-semibold">
                                                                    ${result.maxPrice.toFixed(2)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-10 text-center">
                                                        <p className="text-slate-400 text-sm">No countries detected from 1 or more phone numbers</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination for SMS Results */}
                            {pricesChecked && !smsSearching && smsCountryResults.length > 0 && smsTotalPages > 1 && (
                                <div className="mt-6 mb-6">
                                    <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                                        Showing {smsStartIndex + 1} to {Math.min(smsEndIndex, smsCountryResults.length)} of {smsCountryResults.length} results
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="hidden md:block text-sm text-slate-400">
                                            Showing {smsStartIndex + 1} to {Math.min(smsEndIndex, smsCountryResults.length)} of {smsCountryResults.length} results
                                        </div>

                                        <div className="flex items-center space-x-2 mx-auto md:mx-0">
                                            <button
                                                onClick={() => setSmsCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={smsCurrentPage === 1}
                                                className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>

                                            <div className="flex space-x-1">
                                                {Array.from({ length: Math.min(2, smsTotalPages - (smsCurrentPage - 1)) }, (_, i) => smsCurrentPage + i).map((page) => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setSmsCurrentPage(page)}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${smsCurrentPage === page
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-slate-800/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => setSmsCurrentPage(prev => Math.min(prev + 1, smsTotalPages))}
                                                disabled={smsCurrentPage === smsTotalPages}
                                                className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Total Price + Send Button */}
                            {(pricesChecked && !smsSearching && smsCountryResults.length > 0) && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                                    <div className="text-center sm:text-left">
                                        <p className="text-sm text-slate-400 tracking-wider font-semibold">Total price</p>
                                        <p className="text-lg font-bold text-emerald-400">${calculateTotalPrice().toFixed(2)}</p>
                                    </div>
                                    <button
                                        onClick={handleSendSMS}
                                        disabled={sending || phoneNumbers.length === 0 || smsMessage.trim() === '' || phoneInput.trim() !== '' || phoneNumbers.some(n => !isNumberValid(n))}
                                        className="group px-6 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-[1.02] border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[140px]"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative z-10 flex items-center justify-center">
                                            {sending ? (
                                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <span className="group-hover:tracking-wide transition-all duration-300">
                                                    Send SMS
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error Modal*/}
                {showErrorModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
                            <div className="text-center">
                                <div className="mb-4">
                                    <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">{errorModalTitle || 'Search Error'}</h3>
                                <p className="text-blue-200 mb-4">{errorModalBody || error}</p>
                                <button
                                    onClick={() => {
                                        setShowErrorModal(false);
                                        setError(null);
                                        setErrorModalBody('');
                                        setErrorModalTitle('Error');
                                    }}
                                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Modal */}
                {showDirectSuccessModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
                            <div className="text-center">
                                <div className="mb-4">
                                    <div className="w-12 h-12 mx-auto bg-emerald-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Success</h3>
                                <p className="text-blue-200 mb-4">Your SMS has been sent correctly</p>
                                <button
                                    onClick={() => setShowDirectSuccessModal(false)}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Success but Moderation Modal */}
                {showSuccessModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
                            <div className="text-center">
                                <div className="mb-4">
                                    <div className="w-12 h-12 mx-auto bg-emerald-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Success</h3>
                                <p className="text-blue-200 mb-4">Your SMS might be submitted for moderation, which will take a few minutes</p>
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        navigate('/history?tab=voip');
                                    }}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                                >
                                    Check History
                                </button>

                            </div>
                        </div>
                    </div>
                )}

                {/* Partial Success Modal */}
                {showPartialSuccessModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
                            <div className="text-center">
                                <div className="mb-4">
                                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">SMS partially sent</h3>

                                <div className="text-left mb-4">
                                    <p className="text-blue-200 text-sm mb-2 text-center">Your message could not be sent to these numbers:</p>

                                    <div className="bg-slate-800/50 rounded-lg p-3 h-32 overflow-y-auto dashboard-scrollbar mb-2 border border-slate-600/30">
                                        <ul className="space-y-1">
                                            {failedNumbers.map((num, idx) => (
                                                <li key={idx} className="text-slate-300 text-sm flex items-center">
                                                    <span className="mr-2">•</span> {num}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <p className="text-blue-200 text-sm mt-2 text-center">
                                        You were not charged for these numbers
                                    </p>
                                </div>

                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => {
                                            setPhoneNumbers(failedNumbers);

                                            setPricesChecked(false);
                                            setSmsCountryResults([]);
                                            setSmsCurrentPage(1);
                                            setPhoneInput('');

                                            setShowPartialSuccessModal(false);
                                            setFailedNumbers([]);
                                        }}
                                        className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg text-sm min-w-[100px]"
                                    >
                                        Try again
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowPartialSuccessModal(false);
                                            setFailedNumbers([]);
                                        }}
                                        className="bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg text-sm"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default SendSMS;