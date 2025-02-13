'use client';
import React, { useState, useEffect } from 'react';
import { Search, Send } from 'lucide-react';

const CustomerBalanceManager = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [sendingMessages, setSendingMessages] = useState(false);
  const [currentCustomerIndex, setCurrentCustomerIndex] = useState(0);
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const formatPhoneNumber = (phone) => {
    // הסר כל תו שאינו ספרה
    let cleaned = phone?.replace(/\D/g, '');
    
    // אם המספר מתחיל ב-0, החלף אותו ב-972
    if (cleaned?.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    }
    
    // אם אין קידומת 972, הוסף אותה
    if (!cleaned?.startsWith('972')) {
      cleaned = '972' + cleaned;
    }
    
    return cleaned;
  };

  const getCustomerOpenInvoices = async (customerId, fromDate) => {
    try {
      const response = await fetch('https://api.yeshinvoice.co.il/api/v1/getOpenInvoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': JSON.stringify({
            secret: '094409be-bb9c-4a51-b3b5-2d15dc2d2154',
            userkey: 'CWKaRN8167zMA5niguEf'
          })
        },
        body: JSON.stringify({
          CustomerID: customerId,
          PageSize: 1000,
          PageNumber: 1,
          docTypeID: 0,
          from: `${fromDate} 00:00`,
          to: new Date().toISOString().split('T')[0] + ' 23:59'
        })
      });

      const data = await response.json();
      if (data.Success) {
        return data.ReturnValue.reduce((sum, invoice) => sum + invoice.TotalPrice, 0);
      }
      return 0;
    } catch (err) {
      console.error('Error fetching invoices for customer:', customerId, err);
      return 0;
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://api.yeshinvoice.co.il/api/v1/getAllCustomers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': JSON.stringify({
            secret: '094409be-bb9c-4a51-b3b5-2d15dc2d2154',
            userkey: 'CWKaRN8167zMA5niguEf'
          })
        },
        body: JSON.stringify({
          PageSize: 1000,
          PageNumber: 1,
          Search: searchTerm,
          PortfolioID: 0,
          orderby: {
            column: "Balance",
            asc: "desc"
          }
        })
      });

      const data = await response.json();
      
      if (data.Success) {
        const customersWithNegativeBalance = data.ReturnValue.filter(customer => customer.balance < 0);
        
        const updatedCustomers = await Promise.all(
          customersWithNegativeBalance.map(async (customer) => {
            const invoicesAfterDate = await getCustomerOpenInvoices(customer.id, dateFilter);
            return {
              ...customer,
              balance: customer.balance + invoicesAfterDate
            };
          })
        );

        setCustomers(updatedCustomers.filter(customer => customer.balance < 0));
      } else {
        setError(data.ErrorMessage || 'שגיאה בטעינת נתונים');
      }
    } catch (err) {
      setError('שגיאה בתקשורת עם השרת');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [dateFilter, searchTerm]);

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(customers.map(customer => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const getTotalDebt = () => {
    return customers.reduce((sum, customer) => sum + Math.abs(customer.balance), 0);
  };

  const sendWhatsAppReminders = async (customerIds = selectedCustomers) => {
    const selectedCustomersData = customers.filter(customer => customerIds.includes(customer.id));
    setSendingMessages(true);
    setCurrentCustomerIndex(0);

    for (let i = 0; i < selectedCustomersData.length; i++) {
      const customer = selectedCustomersData[i];
      setCurrentCustomerIndex(i);

      const phoneToUse = customer.phone2 || customer.phone;
      if (!phoneToUse) {
        console.error('No phone number found for customer:', customer.name);
        continue;
      }

      const formattedPhone = formatPhoneNumber(phoneToUse);
      const message = `שלום ${customer.name},
ברצוננו להזכיר כי קיימת יתרת חוב על סך ${formatCurrency(customer.balance)}.
נודה להסדרת התשלום בהקדם.

בברכה,
${window.location.hostname}`;

      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      if (i < selectedCustomersData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setSendingMessages(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-right mb-4">ניהול יתרות פתוחות</h1>
        <div className="flex gap-4 flex-wrap">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-40 p-2 border rounded text-right"
          />
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="חיפוש לקוח..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 text-right border rounded"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-4">טוען נתונים...</div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border text-right w-12">
                    <label className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.length === customers.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </label>
                  </th>
                  <th className="p-2 border text-right w-1/3">שם הלקוח</th>
                  <th className="p-2 border text-right w-1/4">טלפון</th>
                  <th className="p-2 border text-right w-1/6">יתרת חוב</th>
                  <th className="p-2 border text-right w-1/6">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => handleCustomerSelect(customer.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="p-2 border truncate" title={customer.name}>{customer.name}</td>
                    <td className="p-2 border" dir="ltr">{customer.phone2 || customer.phone}</td>
                    <td className="p-2 border text-red-500 text-right">
                      {formatCurrency(customer.balance)}
                    </td>
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => sendWhatsAppReminders([customer.id])}
                        disabled={sendingMessages}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 mx-auto"
                      >
                        <Send className="h-3 w-3" />
                        שלח
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan="3" className="p-2 border text-right">סה"כ חובות פתוחים:</td>
                  <td colSpan="2" className="p-2 border text-red-500 text-right">{formatCurrency(getTotalDebt())}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {selectedCustomers.length} לקוחות נבחרו מתוך {customers.length}
            </div>
            <button
              onClick={sendWhatsAppReminders}
              disabled={selectedCustomers.length === 0 || sendingMessages}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
            >
              {sendingMessages ? (
                <>
                  <span className="animate-spin">⏳</span>
                  שולח {currentCustomerIndex + 1} מתוך {selectedCustomers.length}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  שלח תזכורת בווטסאפ
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerBalanceManager;