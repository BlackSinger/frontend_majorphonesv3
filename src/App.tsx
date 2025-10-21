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
import API from './components/API';
import PaymentReturn from './components/PaymentReturn';
import PaymentReview from './components/PaymentReview';
/**/
import MajorDashboard from './components/MajorDashboard';
import MajorHistory from './components/MajorHistory';
import MajorHistoryUser from './components/MajorHistoryUser';
import MajorTransactions from './components/MajorTransactions';
import MajorTransactionsUser from './components/MajorTransactionsUser';
import MajorUser from './components/MajorUser';
import MajorExtra from './components/MajorExtra';
import MajorTickets from './components/MajorTickets';
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
            <Route path="/api" element={<PrivateRoute><API /></PrivateRoute>} />
            <Route path="/payment-review" element={<PrivateRoute><PaymentReview /></PrivateRoute>} />
            <Route path="/payment-return" element={<PrivateRoute><PaymentReturn /></PrivateRoute>} />
            {/**/}
            <Route path="/major-dashboard" element={<PrivateRoute><MajorDashboard /></PrivateRoute>} />
            <Route path="/major-history" element={<PrivateRoute><MajorHistory /></PrivateRoute>} />
            <Route path="/major-user-history" element={<PrivateRoute><MajorHistoryUser /></PrivateRoute>} />
            <Route path="/major-transactions" element={<PrivateRoute><MajorTransactions /></PrivateRoute>} />
            <Route path="/major-user-transactions" element={<PrivateRoute><MajorTransactionsUser /></PrivateRoute>} />
            <Route path="/major-user" element={<PrivateRoute><MajorUser /></PrivateRoute>} />
            <Route path="/major-tickets" element={<PrivateRoute><MajorTickets /></PrivateRoute>} />
            <Route path="/major-extra" element={<PrivateRoute><MajorExtra /></PrivateRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
