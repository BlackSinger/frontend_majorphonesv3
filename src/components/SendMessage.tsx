import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, Timestamp, onSnapshot, doc, orderBy } from 'firebase/firestore';

interface NumberOption {
  id: string;
  number: string;
  price: number;
  country: string;
  countryCode: string;
  countryPrefix: string;
  duration: number;
  successRate: number;
}

interface SentMessage {
  id: string;
  text: string;
  timestamp: Date;
}

interface Order {
  uid: string;
  number: string | number;
  maySend: boolean;
  expiry: Timestamp;
  sms?: string;
  orderId?: string;
  serviceName?: string;
  messagesSent?: string[];
  docId?: string;
  createdAt?: Timestamp;
  isExpired?: boolean;
}

const SendMessage: React.FC = () => {
  const navigate = useNavigate();

  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [selectedNumberData, setSelectedNumberData] = useState<Order | null>(null);
  const [searchResults, setSearchResults] = useState<NumberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [messageData, setMessageData] = useState({ message: '', orderId: '' });
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [orderDocId, setOrderDocId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time listener for available numbers from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setFirestoreError('No user authenticated');
      setLoading(false);
      return;
    }

    setLoading(true);
    setFirestoreError(null);

    const ordersRef = collection(db, 'orders');
    const now = Timestamp.now();

    const q = query(
      ordersRef,
      where('uid', '==', user.uid),
      where('maySend', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const numbers: Order[] = [];
        const currentTime = Timestamp.now();

        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data() as Order;

          // Only include if sms is not null/undefined
          if (data.sms && data.sms.trim() !== '') {
            const isExpired = data.expiry.toMillis() <= currentTime.toMillis();
            numbers.push({
              ...data,
              docId: docSnapshot.id,
              isExpired: isExpired
            });
          }
        });

        // Sort: first non-expired (by createdAt desc), then expired (by createdAt desc)
        numbers.sort((a, b) => {
          // First priority: non-expired before expired
          if (a.isExpired !== b.isExpired) {
            return a.isExpired ? 1 : -1;
          }

          // Second priority: within same expiry status, sort by createdAt (most recent first)
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setAvailableNumbers(numbers);
        setLoading(false);
        console.log('Available numbers updated:', numbers);
      },
      (error: any) => {
        console.error('Error listening to available numbers:', error);

        // Handle specific Firebase errors
        let errorMsg = 'An error occurred when loading the orders, please try again';

        if (error?.code === 'permission-denied') {
          errorMsg = 'Access denied, you cannot check these orders';
        } else if (error?.code === 'unavailable') {
          errorMsg = 'Service temporarily unavailable, please try again';
        } else if (error?.code === 'unauthenticated') {
          errorMsg = 'You are not authenticated';
        } else if (error?.message) {
          errorMsg = `Error: ${error.message}`;
        }

        setFirestoreError(errorMsg);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Real-time listener for messagesSent updates
  useEffect(() => {
    if (!orderDocId || !hasSearched) {
      return;
    }

    console.log('Setting up real-time listener for order:', orderDocId);

    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderDocId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as Order;
          console.log('Order data updated:', data);

          // Update messagesSent in real-time
          if (data.messagesSent && data.messagesSent.length > 0) {
            const updatedMessages: SentMessage[] = data.messagesSent.map((msg, index) => ({
              id: `msg-${index}`,
              text: msg,
              timestamp: new Date()
            }));
            setSentMessages(updatedMessages);
            console.log('Messages updated from Firestore:', updatedMessages);
          } else {
            setSentMessages([]);
            console.log('No messages in messagesSent array');
          }

          // Update selectedNumberData if needed
          setSelectedNumberData(prev => prev ? { ...prev, messagesSent: data.messagesSent } : null);
        }
      },
      (error) => {
        console.error('Error listening to order updates:', error);
      }
    );

    return () => {
      console.log('Cleaning up real-time listener');
      unsubscribe();
    };
  }, [orderDocId, hasSearched]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    // Update messageData with the message
    const updatedMessageData = {
      message: messageInput.trim(),
      orderId: messageData.orderId
    };
    setMessageData(updatedMessageData);

    // Log to console
    console.log('Message Data:', updatedMessageData);

    setIsSending(true);
    setApiError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setApiError('You are not authenticated or your token is invalid');
        setIsSending(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch('https://replyshortsmsusa-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedMessageData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - message will be updated via real-time listener
        // No need to manually add to sentMessages, Firestore will handle it
        setMessageInput('');
        setIsSending(false);
        console.log('Message sent successfully, waiting for Firestore update');
      } else {
        // Handle errors
        let errorMessage = 'Please contact our customer support';

        if (data.message === 'Unauthorized') {
          errorMessage = 'You are not authenticated or your token is invalid';
          setMessageInput(''); // Clear textarea
        } else if (data.message === 'Missing parameters in request body') {
          errorMessage = 'Please refresh and try again';
          // Keep textarea content
        } else if (data.message === 'Insufficient balance') {
          errorMessage = 'You do not have enough balance to send an SMS to this number';
          // Keep textarea content
        } else if (data.message === 'Order not found') {
          errorMessage = 'Please contact our customer support';
          // Keep textarea content
        } else if (data.message === 'Cannot reply to SMS for this order') {
          errorMessage = 'You cannot send an SMS to this number';
          setMessageInput(''); // Clear textarea
        } else if (data.message === 'Internal Server Error') {
          errorMessage = 'Please contact our customer support';
          // Keep textarea content
        }

        setApiError(errorMessage);
        setIsSending(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setApiError('Please contact our customer support');
      setIsSending(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedNumber) {
      setShowErrorModal(true);
      return;
    }

    setIsSearching(true);
    setHasSearched(false);

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Set the document ID for the real-time listener
      if (selectedNumberData?.docId) {
        setOrderDocId(selectedNumberData.docId);
        console.log('Order document ID set:', selectedNumberData.docId);
      }

      // Load previous messages from messagesSent array (initial load)
      if (selectedNumberData?.messagesSent && selectedNumberData.messagesSent.length > 0) {
        const previousMessages: SentMessage[] = selectedNumberData.messagesSent.map((msg, index) => ({
          id: `prev-${index}`,
          text: msg,
          timestamp: new Date() // We don't have timestamps for old messages, so use current time
        }));
        setSentMessages(previousMessages);
        console.log('Initial messages loaded:', previousMessages);
      } else {
        setSentMessages([]); // Clear messages if no previous messages
        console.log('No initial messages found');
      }

      // Mock data for empty simcard numbers
      const mockResults: NumberOption[] = [
        {
          id: '1',
          number: '555-0123',
          price: 25.00,
          country: 'United States',
          countryCode: 'US',
          countryPrefix: '+1',
          duration: 30,
          successRate: 99
        }
      ];

      setSearchResults(mockResults);
    } catch (error) {
      console.error('Error searching numbers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  return (
    <DashboardLayout currentPath="/sendmessage">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Send message
                </h1>
                <p className="text-slate-300 text-md text-left">Reply multiple times to short numbers</p>
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
                <li>• They can send SMS only to the number selected</li>
                <li>• They can send SMS only if a code has arrived</li>
                <li>• They can send multiple SMS in 5 minutes</li>
                <li>• Their duration can't be extended</li>
                <li>• They can't be cancelled</li>
                <li>• Sent SMS can't be edited or cancelled</li>
                <li>• SMS can't contain images, videos, etc, only text</li>
              </ul>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <>
            {/* Main Content Section */}
          <div className={`rounded-3xl shadow-2xl border border-slate-700/50 relative ${isCountryDropdownOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="p-6">
              <div className="relative z-10 mx-auto">
                {/* Search Header */}
                <div className="text-left mb-9">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                    Search For Numbers
                  </h1>
                  <p className="text-slate-300 text-md">Find the number to send SMS to</p>
                </div>
                
                {/* Search Form */}
                <div className="space-y-9">
                  {/* Form Elements Container */}
                  <div className="space-y-6">
                    {/* Country Selection and Search Button Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                      {/* Country Selection */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider text-center">
                          Select Number
                        </label>
                        <div className="relative group" ref={dropdownRef}>
                          <div
                            onClick={() => !loading && !firestoreError && availableNumbers.length > 0 && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            className={`w-full pl-12 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner transition-all duration-300 flex items-center justify-between ${
                              loading || firestoreError || availableNumbers.length === 0
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50'
                            }`}
                          >
                            <div className="flex items-center w-full">
                              <div className="absolute left-4">
                                <svg className="w-5 h-4 inline-block" viewBox="0 0 60 40">
                                  <rect width="60" height="40" fill="#B22234"/>
                                  <rect width="60" height="3" y="3" fill="white"/>
                                  <rect width="60" height="3" y="9" fill="white"/>
                                  <rect width="60" height="3" y="15" fill="white"/>
                                  <rect width="60" height="3" y="21" fill="white"/>
                                  <rect width="60" height="3" y="27" fill="white"/>
                                  <rect width="60" height="3" y="33" fill="white"/>
                                  <rect width="24" height="21" fill="#3C3B6E"/>
                                </svg>
                              </div>
                              <span className={selectedNumber ? '' : 'text-slate-400'}>
                                {loading ? 'Loading...' : (availableNumbers.length === 0 && !loading ? 'No numbers available' : (selectedNumber || 'Choose'))}
                              </span>
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
                              {availableNumbers.length === 0 ? (
                                <div className="px-4 py-3 text-slate-400 text-center">
                                  No numbers available
                                </div>
                              ) : (
                                availableNumbers.map((orderData) => {
                                  const numberStr = '+' + String(orderData.number);
                                  return (
                                    <div
                                      key={numberStr}
                                      onClick={() => {
                                        setSelectedNumber(numberStr);
                                        setSelectedNumberData(orderData);
                                        setMessageData({ ...messageData, orderId: orderData.orderId || '' });
                                        setOrderDocId(orderData.docId || null);
                                        setIsCountryDropdownOpen(false);
                                      }}
                                      className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                    >
                                      <div className="mr-2">
                                        <svg className="w-5 h-4 inline-block" viewBox="0 0 60 40">
                                          <rect width="60" height="40" fill="#B22234"/>
                                          <rect width="60" height="3" y="3" fill="white"/>
                                          <rect width="60" height="3" y="9" fill="white"/>
                                          <rect width="60" height="3" y="15" fill="white"/>
                                          <rect width="60" height="3" y="21" fill="white"/>
                                          <rect width="60" height="3" y="27" fill="white"/>
                                          <rect width="60" height="3" y="33" fill="white"/>
                                          <rect width="24" height="21" fill="#3C3B6E"/>
                                        </svg>
                                      </div>
                                      <span className="text-white">{numberStr}</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Search Button */}
                      <div className="space-y-3 flex flex-col justify-end">
                        <div className="hidden md:block text-sm font-semibold text-transparent uppercase tracking-wider">
                          Search
                        </div>
                        <button
                          onClick={handleSearch}
                          disabled={loading || isSearching || !selectedNumber || !!firestoreError}
                          className="group px-8 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[150px]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                          <div className="relative z-10 flex items-center justify-center">
                            {loading || isSearching ? (
                              <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <span className="group-hover:tracking-wide transition-all duration-300">
                                <span>Send SMS</span>
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
                      Back to Search
                    </span>
                  </button>
                </div>

                {/* Results Header */}
                <div className="text-left mb-7">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    Send SMS
                  </h1>
                  <p className="text-slate-300 text-md">
                    {searchResults.length > 0
                      ? (
                          <span>
                            To number {selectedNumber} {selectedNumberData?.serviceName && `for ${selectedNumberData.serviceName}`}
                          </span>
                        )
                      : (
                          <span>
                            No numbers found for {selectedNumber}
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
                        {/* Chat Interface */}
                        <div className="flex flex-col h-96">
                          {/* Received Message - SMS from Order */}
                          {selectedNumberData?.sms && (
                            <div className="flex justify-start mb-3">
                              <div className="relative bg-slate-700/50 rounded-lg px-4 py-2 max-w-[85%] sm:max-w-sm md:max-w-md">
                                <p className="text-white text-sm break-words" style={{ textAlign: 'justify' }}>{selectedNumberData.sms}</p>
                                {/* Chat bubble tail */}
                                <div className="absolute left-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-slate-700/50 border-b-8 border-b-transparent -translate-x-2"></div>
                              </div>
                            </div>
                          )}

                          {/* Messages Area */}
                          <div className="flex-1 overflow-y-auto mb-4 space-y-3 px-3">
                            {sentMessages.map((message) => (
                              <div key={message.id} className="flex justify-end">
                                <div className="relative bg-emerald-600/80 rounded-lg px-4 py-2 max-w-[85%] sm:max-w-sm md:max-w-md">
                                  <p className="text-white text-sm break-words" style={{ textAlign: 'justify' }}>{message.text}</p>
                                  {/* Chat bubble tail for sent messages */}
                                  <div className="absolute right-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-emerald-600/80 border-b-8 border-b-transparent translate-x-2"></div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Input Area */}
                          <div className="flex space-x-3">
                            <textarea
                              placeholder={selectedNumberData?.isExpired ? "This number has expired" : "Type your message"}
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !isSending && !selectedNumberData?.isExpired) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              disabled={isSending || selectedNumberData?.isExpired}
                              className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 resize-none h-12 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
                              rows={3}
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={!messageInput.trim() || isSending || selectedNumberData?.isExpired}
                              className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSending ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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

        {/* Error Modal - No Number Selected */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Error</h3>
                <p className="text-blue-200 mb-4">Please select a number first</p>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Modal - Firestore Connection Error */}
        {firestoreError && (
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
                <p className="text-blue-200 mb-4">{firestoreError}</p>
                <button
                  onClick={() => setFirestoreError(null)}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Modal - API Error */}
        {apiError && (
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
                <h3 className="text-lg font-medium text-white mb-2">Error</h3>
                <p className="text-blue-200 mb-4">{apiError}</p>
                <button
                  onClick={() => setApiError(null)}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SendMessage;