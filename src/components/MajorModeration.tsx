import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, getAuth } from 'firebase/auth';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';


const MajorModeration: React.FC = () => {
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [isVoipIdCopied, setIsVoipIdCopied] = useState(false);

    const [voipDataFetched, setVoipDataFetched] = useState(false);
    const [cachedVoipData, setCachedVoipData] = useState<{
        id: string;
        orderId: string;
        number: string;
        country: string;
        message: string;
        price: number;
        status: string;
        type: string;
        createdAt: string;
        email: string;
    }[]>([]);
    const [voipNumberSearch, setVoipNumberSearch] = useState('');
    const [voipEmailSearch, setVoipEmailSearch] = useState('');
    const [currentVoipPage, setCurrentVoipPage] = useState(1);
    const [showVoipInfoModal, setShowVoipInfoModal] = useState(false);
    const [selectedVoipRecord, setSelectedVoipRecord] = useState<{
        id: string;
        orderId: string;
        number: string;
        country: string;
        message: string;
        price: number;
        status: string;
        type: string;
        createdAt: string;
        email: string;
    } | null>(null);

    const [moderatingOrderId, setModeratingOrderId] = useState<string | null>(null);
    const [moderatingAction, setModeratingAction] = useState<'accept' | 'decline' | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const itemsPerPage = 10;

    const filteredVoipData = useMemo(() => {
        let filtered = cachedVoipData;
        if (voipNumberSearch.trim() !== '') {
            filtered = filtered.filter(record =>
                record.number.includes(voipNumberSearch.trim())
            );
        }
        if (voipEmailSearch.trim() !== '') {
            filtered = filtered.filter(record =>
                record.email.toLowerCase().includes(voipEmailSearch.trim().toLowerCase())
            );
        }
        return filtered;
    }, [cachedVoipData, voipNumberSearch, voipEmailSearch]);


    const totalVoipPages = Math.ceil(filteredVoipData.length / itemsPerPage);
    const voipStartIndex = (currentVoipPage - 1) * itemsPerPage;
    const voipEndIndex = voipStartIndex + itemsPerPage;
    const paginatedVoipData = filteredVoipData.slice(voipStartIndex, voipEndIndex);

    useEffect(() => {
        const fetchData = async () => {
            if (voipDataFetched) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            try {
                const currentUser = getAuth().currentUser;

                if (!currentUser) {
                    setIsLoading(false);
                    return;
                }

                const idToken = await currentUser.getIdToken();

                const response = await fetch('https://getvoipordersmoderation-ezeznlhr5a-uc.a.run.app', {
                    method: 'GET',
                    headers: {
                        'authorization': `${idToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                console.log('getVoipOrdersModeration response:', data);

                if (response.ok) {
                    if (data.message === 'VoIP moderation orders found') {
                        const voipOrdersArray = data.orders || [];

                        const formattedVoipData = voipOrdersArray.map((item: any) => {
                            let formattedDate = 'N/A';
                            if (item.createdAt && item.createdAt._seconds) {
                                const date = new Date(item.createdAt._seconds * 1000);
                                formattedDate = date.toLocaleString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                });
                            }

                            return {
                                id: item.id || item.orderId || 'N/A',
                                orderId: item.orderId || item.id || 'N/A',
                                number: String(item.number || ''),
                                country: String(item.country || 'N/A'),
                                message: String(item.message || ''),
                                price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
                                status: String(item.status || ''),
                                type: String(item.type || ''),
                                createdAt: formattedDate,
                                email: item.email || 'N/A'
                            };
                        });

                        setCachedVoipData(formattedVoipData);
                        setVoipDataFetched(true);
                        setIsLoading(false);

                    } else if (data.message === 'No VoIP orders in moderation') {
                        setCachedVoipData([]);
                        setVoipDataFetched(true);
                        setIsLoading(false);
                    }

                } else if (response.status === 403) {
                    const auth = getAuth();
                    await signOut(auth);
                    navigate('/signin');
                    return;

                } else if (response.status === 500) {
                    setErrorMessage('Please refresh');
                    setShowErrorModal(true);
                    setIsLoading(false);
                }

            } catch (error) {
                console.error('Error fetching moderation orders:', error);
                setErrorMessage('Please refresh');
                setShowErrorModal(true);
                setIsLoading(false);
            }
        };

        fetchData();
    }, [navigate, voipDataFetched]);


    const handleCopyVoipId = async () => {
        if (selectedVoipRecord) {
            try {
                await navigator.clipboard.writeText(selectedVoipRecord.orderId);
                setIsVoipIdCopied(true);
                setTimeout(() => setIsVoipIdCopied(false), 2000);
            } catch (err) {
            }
        }
    };

    const handleModeration = async (orderId: string, acceptSMS: boolean) => {
        setModeratingOrderId(orderId);
        setModeratingAction(acceptSMS ? 'accept' : 'decline');

        try {
            const currentUser = getAuth().currentUser;
            if (!currentUser) {
                setModeratingOrderId(null);
                return;
            }

            const idToken = await currentUser.getIdToken();

            const response = await fetch('https://moderationsendsms-ezeznlhr5a-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'authorization': `${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId: orderId,
                    acceptSMS: acceptSMS
                })
            });

            const data = await response.json();
            console.log('moderationSendSMS response:', data);

            if (response.ok) {
                if (data.message === 'Order completed and SMS sent') {
                    setSuccessMessage('You have approved this SMS, it will be sent right away');
                    setShowSuccessModal(true);
                    setCachedVoipData(prev => prev.filter(item => item.id !== orderId));
                } else if (data.message === 'Order rejected and user refunded') {
                    setSuccessMessage("You have rejected this SMS, it won't be sent");
                    setShowSuccessModal(true);
                    setCachedVoipData(prev => prev.filter(item => item.id !== orderId));
                }
            }
            else if (response.status === 400) {
                if (data.message === 'Missing or invalid parameters') {
                    setErrorMessage('Missing or invalid parameters');
                    setShowErrorModal(true);
                } else if (data.message === 'Order is not in moderation status') {
                    setErrorMessage('Order is not in moderation status');
                    setShowErrorModal(true);
                }
            } else if (response.status === 404) {
                if (data.message === 'Order not found') {
                    setErrorMessage('Order not found');
                    setShowErrorModal(true);
                }
            } else if (response.status === 403) {
                const auth = getAuth();
                await signOut(auth);
                navigate('/signin');
                return;
            } else if (response.status === 500) {
                if (data.message === 'Failed to send SMS via Twilio') {
                    setErrorMessage(data.twilioError || 'Failed to send SMS via Twilio');
                    setShowErrorModal(true);
                } else if (data.message === 'Internal Error') {
                    setErrorMessage('Missing or invalid parameters');
                    setShowErrorModal(true);
                }
            }

            setModeratingOrderId(null);
            setModeratingAction(null);

        } catch (error) {
            console.error('Error in moderation:', error);
            setErrorMessage('Please refresh');
            setShowErrorModal(true);
            setModeratingOrderId(null);
            setModeratingAction(null);
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
                                Moderation
                            </h1>
                            <p className="text-slate-300 text-md text-left">View all VoIP orders awaiting moderation</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
                <div className="p-6">
                    {/* VoIP Filters */}
                    <div className="mb-6">
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* Email Search */}
                            <div className="flex-1">
                                <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                                    Email
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={voipEmailSearch}
                                        onChange={(e) => {
                                            setVoipEmailSearch(e.target.value);
                                            setCurrentVoipPage(1);
                                        }}
                                        placeholder="Enter email address"
                                        className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Number Search */}
                            <div className="flex-1">
                                <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                                    Recipient Number
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={voipNumberSearch}
                                        onChange={(e) => {
                                            const onlyNums = e.target.value.replace(/\D/g, '');
                                            setVoipNumberSearch(onlyNums);
                                            setCurrentVoipPage(1);
                                        }}
                                        placeholder="Enter phone number"
                                        className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* VoIP Table */}
                    <div className="overflow-x-auto overflow-y-visible">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-slate-400 mt-4">Loading orders...</p>
                            </div>
                        ) : showErrorModal ? (
                            <></>
                        ) : filteredVoipData.length > 0 ? (
                            <>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Info</th>
                                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">User</th>
                                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Recipient</th>
                                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Country</th>
                                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Message</th>
                                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Price</th>
                                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Status</th>
                                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Moderation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedVoipData.map((record, index) => (
                                            <tr
                                                key={record.id}
                                                className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'}`}
                                            >
                                                {/* Info */}
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-center">
                                                        <button
                                                            onClick={() => { setSelectedVoipRecord(record); setShowVoipInfoModal(true); setIsVoipIdCopied(false); }}
                                                            className="p-2 text-slate-400 hover:text-green-500 transition-colors duration-200 rounded-lg hover:bg-slate-700/30"
                                                            title="View Information"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* User */}
                                                <td className="py-4 px-6 text-white">{record.email}</td>
                                                {/* Recipient */}
                                                <td className="py-4 px-6">
                                                    <div className="font-mono text-white text-center">+{record.number}</div>
                                                </td>
                                                {/* Country */}
                                                <td className="py-4 px-6 text-white text-center">{record.country}</td>
                                                {/* Message */}
                                                <td className="py-4 px-6 text-white text-center max-w-xs">
                                                    <span className="whitespace-normal break-words">{record.message}</span>
                                                </td>
                                                {/* Price */}
                                                <td className="py-4 px-6 text-center">
                                                    <span className="text-emerald-400 font-semibold">${record.price.toFixed(2)}</span>
                                                </td>
                                                {/* Status */}
                                                <td className="py-4 px-6 text-center">
                                                    <span style={{ width: '100px' }} className={`inline-block text-center px-3 py-1 rounded-lg text-sm font-semibold border ${record.status === 'Completed'
                                                        ? 'text-green-400 border-green-500/30 bg-green-500/20'
                                                        : record.status === 'Failed'
                                                            ? 'text-red-400 border-red-500/30 bg-red-500/20'
                                                            : record.status === 'Rejected'
                                                                ? 'text-red-400 border-red-500/30 bg-red-500/20'
                                                                : record.status === 'Moderation'
                                                                    ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/20'
                                                                    : 'text-gray-400 border-gray-500/30 bg-gray-500/20'
                                                        }`}>
                                                        {record.status === 'Moderation' ? 'Awaiting moderation' : record.status}
                                                    </span>
                                                </td>
                                                {/* Moderation */}
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleModeration(record.id, true)}
                                                            disabled={moderatingOrderId !== null}
                                                            className="w-24 h-9 flex items-center justify-center bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                                        >
                                                            {moderatingOrderId === record.id && moderatingAction === 'accept' ? (
                                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : (
                                                                'Accepted'
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleModeration(record.id, false)}
                                                            disabled={moderatingOrderId !== null}
                                                            className="w-24 h-9 flex items-center justify-center bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:via-red-500 hover:to-red-600 text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-105 border border-red-500/30 hover:border-red-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                                        >
                                                            {moderatingOrderId === record.id && moderatingAction === 'decline' ? (
                                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : (
                                                                'Declined'
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>

                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* VoIP Pagination */}
                                {totalVoipPages > 1 && (
                                    <div className="mt-6">
                                        <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                                            Showing {voipStartIndex + 1} to {Math.min(voipEndIndex, filteredVoipData.length)} of {filteredVoipData.length} results
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="hidden md:block text-sm text-slate-400">
                                                Showing {voipStartIndex + 1} to {Math.min(voipEndIndex, filteredVoipData.length)} of {filteredVoipData.length} results
                                            </div>
                                            <div className="flex items-center space-x-2 mx-auto md:mx-0">
                                                <button
                                                    onClick={() => setCurrentVoipPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentVoipPage === 1}
                                                    className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <div className="flex space-x-1">
                                                    {[currentVoipPage, currentVoipPage + 1].filter(page => page <= totalVoipPages).map((page) => (
                                                        <button
                                                            key={page}
                                                            onClick={() => setCurrentVoipPage(page)}
                                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentVoipPage === page
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-slate-800/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setCurrentVoipPage(prev => Math.min(prev + 1, totalVoipPages))}
                                                    disabled={currentVoipPage === totalVoipPages}
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
                            </>
                        ) : (
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <h1 className="text-xl font-bold text-slate-300 mb-3">No Orders Found</h1>
                                <p className="text-slate-400 text-lg">There are no orders awaiting moderation</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* VoIP Information Modal */}
            {showVoipInfoModal && selectedVoipRecord && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
                        <div className="text-center">
                            <div className="mb-4">
                                <div className="w-12 h-12 mx-auto flex items-center justify-center">
                                    <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Information</h3>
                            <div className="space-y-4 text-left">
                                <div>
                                    <span className="text-slate-300">Order ID: </span>
                                    <span className="text-emerald-400 break-all">{selectedVoipRecord.orderId}
                                        <button
                                            onClick={handleCopyVoipId}
                                            className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                                            title={isVoipIdCopied ? "Copied!" : "Copy Order ID"}
                                        >
                                            {isVoipIdCopied ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-300">Sent on: </span>
                                    <span className="text-emerald-400">{selectedVoipRecord.createdAt}</span>
                                </div>
                            </div>
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={() => setShowVoipInfoModal(false)}
                                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-6 rounded-xl transition-all duration-300 shadow-lg"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
                        <div className="text-center">
                            <div className="mb-4">
                                <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Success</h3>
                            <div className="text-center mb-6">
                                <p className="text-slate-300">{successMessage}</p>
                            </div>
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-6 rounded-xl transition-all duration-300 shadow-lg"
                                >
                                    Ok
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80 max-w-md">
                        <div className="text-center">
                            <div className="mb-4">
                                <div className="w-12 h-12 mx-auto flex items-center justify-center bg-red-500/20 rounded-full">
                                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Error</h3>
                            <p className="text-blue-200 mb-4">{errorMessage}</p>
                            <div className="flex justify-center">
                                <button
                                    onClick={() => {
                                        setShowErrorModal(false);
                                        setErrorMessage('');
                                    }}
                                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                                >
                                    Ok
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MajorModeration;