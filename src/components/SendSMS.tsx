import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import countriesData from '../countries_export.json';
import countriesSimple from '../countries_simple.json';

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
    const itemsPerPage = 10;

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

    // Buscar países en Firestore por los tags
    const handleSearchCountry = async () => {
        if (countryTags.length === 0) return;

        // Primero validar TODOS los tags contra countries_simple.json
        const notFound: string[] = [];
        const matches: { tag: string; isoCountry: string }[] = [];

        for (const tag of countryTags) {
            const match = countriesSimple.find(
                (c: any) => c.country.toLowerCase().startsWith(tag.toLowerCase())
            );
            if (match) {
                matches.push({ tag, isoCountry: match.isoCountry });
            } else {
                notFound.push(tag);
            }
        }

        // Si hay algún país no encontrado, mostrar error y NO buscar en Firestore
        if (notFound.length > 0) {
            setError(`One or more countries weren't found, please check the spelling and try again`);
            setShowErrorModal(true);
            return;
        }

        // Todos los tags son válidos, buscar en Firestore
        setSearching(true);
        try {
            const results: CountryData[] = [];

            for (const { isoCountry } of matches) {
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

    // Cuando el usuario presiona Enter, agrega el tag
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && countryFilter.trim()) {
            e.preventDefault();
            const newTag = countryFilter.trim();
            // Evitar duplicados
            if (!countryTags.some(tag => tag.toLowerCase() === newTag.toLowerCase())) {
                setCountryTags([...countryTags, newTag]);
            }
            setCountryFilter('');
            setSearchResults([]); // Vuelve a la tabla normal
        }
    };

    // Eliminar un tag
    const removeTag = (tagToRemove: string) => {
        setCountryTags(countryTags.filter(tag => tag !== tagToRemove));
        setSearchResults([]); // Vuelve a la tabla normal
    };

    const getFlagEmoji = (isoCode: string): React.ReactElement => {
        // Validar que existe y tiene exactamente 2 caracteres
        if (!isoCode || isoCode.trim().length !== 2) {
            return <span className="text-2xl">🏳️</span>;
        }

        // Limpiar espacios y convertir a MINÚSCULAS (flagcdn requiere minúsculas)
        const cleanCode = isoCode.trim().toLowerCase();

        return (
            <img
                src={`https://flagcdn.com/w40/${cleanCode}.png`}
                alt={`${isoCode} flag`}
                className="w-6 h-5 object-cover rounded shadow-sm"
            />
        );
    };

    // No filtrar mientras escribe, solo cuando haga click en Search country
    const filteredCountries = useMemo(() => {
        return countries;
    }, [countries]);

    // Paginación
    const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCountries = filteredCountries.slice(startIndex, endIndex);

    // Reset página cuando cambia el filtro
    useEffect(() => {
        setCurrentPage(1);
    }, [countryFilter]);

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

                {/* Information Section - Always on top */}
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
                <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        {/* Filters */}
                        <div className="mb-6 space-y-4">
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
                                    <input
                                        type="text"
                                        value={countryFilter}
                                        onChange={(e) => setCountryFilter(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={"Type country name and press Enter..."}
                                        className="flex-1 min-w-[150px] bg-transparent text-white text-sm outline-none placeholder-slate-400"
                                    />
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
                                    onClick={() => {/* función para Send SMS */ }}
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
                                            Country
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Area Code
                                        </th>
                                        {searchResults.length > 0 && (
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
                                {/* Results info - shown above pagination on small screens */}
                                <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                                    Showing {startIndex + 1} to {Math.min(endIndex, filteredCountries.length)} of {filteredCountries.length} results
                                </div>

                                <div className="flex items-center justify-between">
                                    {/* Results info - shown on left side on larger screens */}
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

                {/* Error Modal - Firestore Connection Error */}
                {showErrorModal && error && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
                            <div className="text-center">
                                <div className="mb-4">
                                    <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Search Error</h3>
                                <p className="text-blue-200 mb-4">{error}</p>
                                <button
                                    onClick={() => {
                                        setShowErrorModal(false);
                                        setError(null);
                                    }}
                                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default SendSMS;