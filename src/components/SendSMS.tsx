import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

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
    const itemsPerPage = 10;

    useEffect(() => {
        const loadCountries = async () => {
            setLoading(true);
            setError(null);

            try {
                const countriesRef = collection(db, 'sendSMS', 'opt1', 'countries');
                const querySnapshot = await getDocs(countriesRef);

                const countriesData: CountryData[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    countriesData.push({
                        id: doc.id,
                        country: data.country,
                        isoCountry: data.isoCountry,
                        areaCode: data.areaCode,
                        priceUnit: data.priceUnit,
                        maxPrice: data.maxPrice
                    });
                });

                // Ordenar alfabéticamente por país
                countriesData.sort((a, b) => a.country.localeCompare(b.country));

                setCountries(countriesData);
            } catch (err: any) {
                console.error('Error loading countries:', err);
                let errorMessage = 'An error occurred when loading the data, please try again';

                if (err?.code === 'permission-denied') {
                    errorMessage = 'Access denied, you cannot view this data';
                } else if (err?.code === 'unavailable') {
                    errorMessage = 'Service temporarily unavailable, please try again';
                } else if (err?.code === 'unauthenticated') {
                    errorMessage = 'You are not authenticated';
                } else if (err?.message) {
                    errorMessage = `Error: ${err.message}`;
                }

                setError(errorMessage);
                setShowErrorModal(true);
            } finally {
                setLoading(false);
            }
        };

        loadCountries();
    }, []);

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

    // Filtrar países por nombre
    const filteredCountries = useMemo(() => {
        if (!countryFilter.trim()) {
            return countries;
        }
        return countries.filter(country =>
            country.country.toLowerCase().includes(countryFilter.toLowerCase())
        );
    }, [countries, countryFilter]);

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
                    <div className="mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Country Search Input */}
                            <div>
                                <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                                    Search Country
                                </label>
                                <input
                                    type="text"
                                    value={countryFilter}
                                    onChange={(e) => setCountryFilter(e.target.value)}
                                    placeholder="Type country name..."
                                    className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-400"
                                />
                            </div>

                            {/* Send SMS Button */}
                            <div className="space-y-3 flex flex-col justify-end">
                                <div className="hidden md:block text-sm font-semibold text-transparent uppercase tracking-wider">
                                    Action
                                </div>
                                <button
                                    onClick={() => {/* función para Send SMS */ }}
                                    className="group px-8 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Price
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-20">
                                            <div className="flex flex-col items-center justify-center">
                                                <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <p className="text-slate-400 mt-4">Loading info...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : countries.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-20 text-center">
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
                                            <td className="px-6 py-4">
                                                <span className="text-emerald-400 font-semibold">
                                                    ${country.maxPrice.toFixed(4)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredCountries.length > 0 && totalPages > 1 && (
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
                            <h3 className="text-lg font-medium text-white mb-2">Connection Error</h3>
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
    );
};

export default SendSMS;