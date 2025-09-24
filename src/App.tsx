import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import Account from './components/Account';
import Dashboard from './components/Dashboard';
import ShortNumbers from './components/ShortNumbers';
import Middle from './components/Middle';
import LongTerm from './components/LongTerm';
import EmptySimcard from './components/EmptySimcard';
import SendMessage from './components/SendMessage';
import VirtualCard from './components/VirtualCard';
import Proxies from './components/Proxies';
import History from './components/History';
import Transactions from './components/Transactions';
import Tickets from './components/Tickets';
import Profile from './components/Profile';
import AddFunds from './components/AddFunds';
import './App.css';

function App() {
  useEffect(() => {
    document.title = 'Major Phones LLC';
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<SignIn />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/account" element={<Account />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/short" element={<PrivateRoute><ShortNumbers /></PrivateRoute>} />
            <Route path="/middle" element={<PrivateRoute><Middle /></PrivateRoute>} />
            <Route path="/long" element={<PrivateRoute><LongTerm /></PrivateRoute>} />
            <Route path="/emptysimcard" element={<PrivateRoute><EmptySimcard /></PrivateRoute>} />
            <Route path="/sendmessage" element={<PrivateRoute><SendMessage /></PrivateRoute>} />
            <Route path="/virtualcard" element={<PrivateRoute><VirtualCard /></PrivateRoute>} />
            <Route path="/proxies" element={<PrivateRoute><Proxies /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/tickets" element={<PrivateRoute><Tickets /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/add-funds" element={<PrivateRoute><AddFunds /></PrivateRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
