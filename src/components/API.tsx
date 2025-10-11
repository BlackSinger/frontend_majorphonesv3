import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const API: React.FC = () => {
  const { currentUser } = useAuth();
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'docs'>('keys');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    const fetchAPIKey = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setApiKey(userData.apiKey || '');
        } else {
          setErrorMessage('User data not found in database');
          setShowErrorModal(true);
        }
      } catch (error: any) {

        let errorMsg = 'Failed to load API key, please try again later';

        if (error.code === 'permission-denied') {
          errorMsg = 'Access denied, you cannot check the API key';
        } else if (error.code === 'unavailable') {
          errorMsg = 'Service is temporarily unavailable, please try again';
        } else if (error.code === 'not-found') {
          errorMsg = 'User data not found';
        } else if (error.code === 'unauthenticated') {
          errorMsg = 'You are not authenticated';
        } else if (error.message) {
          errorMsg = error.message;
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAPIKey();
  }, [currentUser]);

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 8)}${'•'.repeat(24)}${key.substring(key.length - 4)}`;
  };

  return (
    <DashboardLayout currentPath="/api">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  API
                </h1>
                <p className="text-slate-300 text-md text-left">Manage your API key and access documentation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Content */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="flex space-x-4 border-b border-slate-700/50">
                <button
                  onClick={() => setActiveTab('keys')}
                  className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                    activeTab === 'keys'
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  API Key
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                    activeTab === 'docs'
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  API Documentation
                </button>
              </div>
            </div>

            {/* API Key Tab Content */}
            {activeTab === 'keys' && (
              <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-400 mt-4">Loading API Key...</p>
              </div>
            ) : apiKey ? (
              <div className="p-4 sm:p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl hover:border-slate-600/50 transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* First div: Your API Key and code */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                      <h3 className="text-md font-semibold text-white">Your API Key</h3>
                      <span className="px-3 py-2 rounded-lg text-sm font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                        Active
                      </span>
                    </div>
                    <code className="flex items-center justify-between gap-2 text-sm font-mono text-slate-300 bg-slate-900/50 px-3 py-2 rounded-lg break-all">
                      <span className="flex-1">{maskKey(apiKey)}</span>
                      <button
                        onClick={handleCopyKey}
                        className="p-1 hover:bg-slate-700/50 rounded transition-colors duration-200 flex-shrink-0"
                        title="Copy API key"
                      >
                        {copiedKey ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </code>
                  </div>

                  {/* Second div: Information messages */}
                  <div className="flex-1 space-y-2">
                    <div className="text-xs sm:text-sm text-slate-400 p-3 bg-slate-700/30 rounded-lg">
                      <p>This key was automatically generated when you registered</p>
                    </div>
                    <div className="text-xs sm:text-sm text-yellow-400 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p>⚠️ Keep this key secure and do not share it publicly</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-slate-700 rounded-2xl mb-4 sm:mb-5">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-300 mb-2 sm:mb-3">No API Key Found</h3>
                <p className="text-slate-400 text-sm sm:text-lg">Please contact support to get your API key</p>
              </div>
            )}
              </>
            )}

            {/* Documentation Tab Content */}
            {activeTab === 'docs' && (
              <>
            <div className="space-y-4 sm:space-y-6">
              
              {/* Authentication Section */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-emerald-400 mb-2 sm:mb-3">Authentication</h3>
                <p className="text-slate-300 text-sm sm:text-base mb-3 sm:mb-4">
                  All API endpoints require authentication using your API key. Include your API key in the request header:
                </p>
                <pre className="bg-slate-900 p-3 sm:p-4 rounded-xl overflow-x-auto mb-3 sm:mb-4">
                  <code className="text-emerald-400 text-xs sm:text-sm">
                    X-API-Key: your-api-key-here
                  </code>
                </pre>
              </div>

              {/* Base URL */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-emerald-400 mb-2 sm:mb-3">Base URL</h3>
                <pre className="bg-slate-900 p-3 sm:p-4 rounded-xl overflow-x-auto">
                  <code className="text-emerald-400 text-xs sm:text-sm">
                    https://api.majorphones.com/
                  </code>
                </pre>
              </div>

              {/* Example Request */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-emerald-400 mb-2 sm:mb-3">Example Request</h3>
                <p className="text-slate-300 text-sm sm:text-base mb-3 sm:mb-4">Here's how to make a request to verify your API key</p>
                
                <div className="mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-slate-400 mb-2 font-semibold">cURL:</p>
                  <pre className="bg-slate-900 p-3 sm:p-4 rounded-xl overflow-x-auto text-left">
                    <code className="text-xs sm:text-sm text-slate-300">
{`curl -X POST https://api.majorphones.com/api/user/verify \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here"`}
                    </code>
                  </pre>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-slate-400 mb-2 font-semibold">JavaScript:</p>
                  <pre className="bg-slate-900 p-3 sm:p-4 rounded-xl overflow-x-auto text-left">
                    <code className="text-xs sm:text-sm text-slate-300">
{`fetch('https://api.majorphones.com/api/user/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  }
})
.then(response => response.json())
.then(data => console.log(data));`}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Available Endpoints */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-emerald-400 mb-3 sm:mb-4">Available Endpoints</h3>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* User Management */}
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">User Management</h4>
                    
                    <div className="space-y-3 sm:space-y-4">
                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/user/verify</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Verify that your API key is valid and active</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            <code>{`-`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">GET</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/user/balance</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get your current account balance</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            <code>{`-`}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SMS Services */}
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">SMS Services</h4>
                    
                    <div className="space-y-3 sm:space-y-4">
                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/prices/short</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get short SMS prices by country and option</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "country": string // Country  "USA", "UK", "France", "Germany", "India" )
  "option": integer // Option: 1=high quality, 2=standard, 3=very high quality
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">GET</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/prices/middle</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get middle-term SMS prices (USA only)</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            <code>{`-`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">GET</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/prices/long</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get long-term SMS prices (USA only)</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Example Response:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            <code>{`-`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/short/buy</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Purchase a short-term SMS number</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "country": string // Country  "USA", "UK", "France", "Germany", "India" )
  "option": integer // Option: 1=high quality, 2=standard, 3=very high quality
  "serviceName": string // Service Name (e.g., "google", "facebook", "twitter")
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-red-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/short/cancel</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Cancel a short SMS order</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to cancel
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/middle/buy</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Purchase a middle-term SMS number</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "serviceName": string // Service ID (e.g., "google", "facebook", "twitter"),
  "duration": integer // Duration in days (1,7,14 only)
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-purple-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/middle/activate</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Activate a middle-term SMS number to receive messages</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to activate,
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-red-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/middle/cancel</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Cancel a middle-term SMS number and get a full refund</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to cancel
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/long/buy</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Purchase a long-term SMS number</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "serviceName": string // Service ID (e.g., "google", "facebook", "twitter"),
  "duration": "integer" // Duration in days (30,365 only)
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-purple-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/long/activate</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Activate a long-term SMS number to receive messages</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to activate,
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-red-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/long/cancel</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Cancel a long-term SMS number and get a full refund</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to cancel
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/simcard/buy</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Purchase an empty SIM card (30 days only)</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            <code>{`-`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-purple-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/simcard/activate</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Activate an empty SIM card for a specific service</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to activate,
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-red-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/simcard/cancel</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Cancel a SIM card and get a refund</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to cancel
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">GET</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/orders/all</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get all your SMS orders</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            <code>{`-`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/orders/specific</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get details of a specific order</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to retrieve,
}`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/sms/orders/get-sms</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get SMS messages for a specific order</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "orderId": string // The orderId of the number to retrieve messages,
}`}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VCC Services */}
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">Virtual Card Services</h4>
                    
                    <div className="space-y-3 sm:space-y-4">
                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">GET</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/vcc/prices</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get virtual card prices</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            <code>{`-`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/vcc/buy</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Purchase a virtual debit card</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "balance": "integer" // Balance amount (0,3)
}`}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Proxy Services */}
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">Proxy Services</h4>
                    
                    <div className="space-y-3 sm:space-y-4">
                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">GET</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/proxy/prices</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Get mobile proxy prices</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            <code>{`-`}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">POST</span>
                          <code className="text-slate-300 text-xs sm:text-sm break-all">/api/proxy/buy</code>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-2">Purchase a mobile proxy</p>
                        <div className="bg-slate-900/50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Request Body:</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto text-left">
                            <code>{`{
  "duration": integer // Duration in days (0,1,7,30 only)
  "state": string // State code (e.g., "CA", "NY", "TX") ("NA" for random USA)
}`}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Format */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-emerald-400 mb-2 sm:mb-3">Response Format</h3>
                
                <div className="mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-slate-400 mb-2 font-semibold">Success Response:</p>
                  <pre className="bg-slate-900 p-3 sm:p-4 rounded-xl overflow-x-auto text-left">
                    <code className="text-xs sm:text-sm text-green-400">
{`{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}`}
                    </code>
                  </pre>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-slate-400 mb-2 font-semibold">Error Response:</p>
                  <pre className="bg-slate-900 p-3 sm:p-4 rounded-xl overflow-x-auto text-left">
                    <code className="text-xs sm:text-sm text-red-400">
{`{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {}
}`}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Rate Limits */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-emerald-400 mb-2 sm:mb-3">Rate Limits</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full text-left min-w-[400px]">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="pb-2 text-slate-300 font-semibold text-xs sm:text-sm w-1/2">Endpoint Type</th>
                        <th className="pb-2 text-slate-300 font-semibold text-xs sm:text-sm">Limit</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-400">
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 text-xs sm:text-sm w-1/3">Default endpoints</td>
                        <td className="py-2 text-xs sm:text-sm">60 requests per minute</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 text-xs sm:text-sm w-1/3">Purchase endpoints</td>
                        <td className="py-2 text-xs sm:text-sm">10 requests per minute</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-xs sm:text-sm w-1/3">Health/Version checks</td>
                        <td className="py-2 text-xs sm:text-sm">60 requests per minute</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error Codes */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-emerald-400 mb-2 sm:mb-3">Common Error Codes</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full text-left min-w-[400px]">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="pb-2 text-slate-300 font-semibold text-xs sm:text-sm w-1/2">Code</th>
                        <th className="pb-2 text-slate-300 font-semibold text-xs sm:text-sm">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-400">
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 w-1/3"><code className="text-red-400 text-xs sm:text-sm">INVALID_API_KEY</code></td>
                        <td className="py-2 text-xs sm:text-sm">API key is invalid or expired</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 w-1/3"><code className="text-red-400 text-xs sm:text-sm">INSUFFICIENT_BALANCE</code></td>
                        <td className="py-2 text-xs sm:text-sm">User has insufficient balance</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 w-1/3"><code className="text-red-400 text-xs sm:text-sm">RISKY_USER</code></td>
                        <td className="py-2 text-xs sm:text-sm">Account flagged for suspicious activity</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 w-1/3"><code className="text-red-400 text-xs sm:text-sm">RATE_LIMIT_EXCEEDED</code></td>
                        <td className="py-2 text-xs sm:text-sm">Too many requests in time window</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 w-1/3"><code className="text-red-400 text-xs sm:text-sm">VALIDATION_ERROR</code></td>
                        <td className="py-2 text-xs sm:text-sm">Request validation failed</td>
                      </tr>
                      <tr>
                        <td className="py-2 w-1/3"><code className="text-red-400 text-xs sm:text-sm">ORDER_NOT_FOUND</code></td>
                        <td className="py-2 text-xs sm:text-sm">Specified order ID does not exist</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Support */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl sm:rounded-2xl p-4">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-slate-300 text-sm font-semibold"><span className="text-md font-bold text-blue-400 mb-2">Need help?</span> For any questions about the documentation or to report an issue, contact us on <a href="https://t.me/MajorPhones" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-semibold">Telegram</a>, <a href="mailto:support@majorphones.com" className="text-blue-400 hover:text-blue-300 underline font-semibold">email</a> or open a <Link to="/tickets" className="text-blue-400 hover:text-blue-300 underline font-semibold">ticket</Link> and we will assist you within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        </div>

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
    </DashboardLayout>
  );
};

export default API;