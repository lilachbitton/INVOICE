'use client';
import React, { useState, useEffect } from 'react';
import { Search, Send, FileText } from 'lucide-react';

const CustomerBalanceManager = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [sendingMessages, setSendingMessages] = useState(false);
  const [currentCustomerIndex, setCurrentCustomerIndex] = useState(0);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState({});
  const [customers, setCustomers] = useState([]);
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const fetchCustomerInvoices = async (customerId) => {
    try {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1); // שנה אחורה

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
          CustomerID: Number(customerId),
          PageSize: 1000,
          PageNumber: 1,
          docTypeID: 0,
          from: startDate.toISOString().split('T')[0] + ' 00:00',
          to: new Date().toISOString().split('T')[0] + ' 23:59'
        })
      });

      const data = await response.json();
      if (data.Success) {
        setCustomerInvoices(prev => ({
          ...prev,
          [customerId]: data.ReturnValue || []
        }));
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setCustomerInvoices(prev => ({
        ...prev,
        [customerId]: []
      }));
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
        setCustomers(customersWithNegativeBalance);
        
        // טען את החשבוניות עבור כל הלקוחות
        for (const customer of customersWithNegativeBalance) {
          await fetchCustomerInvoices(customer.id);
        }
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

  const formatPhoneNumber = (phone) => {
    let cleaned = phone?.replace(/\D/g, '');
    if (cleaned?.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    }
    if (!cleaned?.startsWith('972')) {
      cleaned = '972' + cleaned;
    }
    return cleaned;
  };

  const toggleCustomerDetails = (customerId) => {
    setExpandedCustomer(prev => prev === customerId ? null : customerId);
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
ברצוננו להזכירך כי נכון ליום ${formatDate(dateFilter)}
קיימת יתרת חוב על סך ${formatCurrency(customer.balance)}.
נודה להסדרת התשלום בהקדם.

בברכה,
אבי מלכה
קינוחים מבית טוב`;

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
      {/* Header */}
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
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border text-right w-12">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === customers.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="p-3 border text-right">שם הלקוח</th>
                  <th className="p-3 border text-right w-48">טלפון</th>
                  <th className="p-3 border text-right w-36">יתרת חוב</th>
                  <th className="p-3 border text-right w-36">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <React.Fragment key={customer.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 border text-center align-top">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleCustomerSelect(customer.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="p-3 border">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{customer.name}</span>
                          {customerInvoices[customer.id]?.length > 0 && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleCustomerDetails(customer.id)}
                                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full text-sm transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                <span>{customerInvoices[customer.id].length} חשבוניות</span>
                                <span className="text-blue-400">{expandedCustomer === customer.id ? '▼' : '▶'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 border" dir="ltr">{customer.phone2 || customer.phone}</td>
                      <td className="p-3 border text-red-500 text-right font-medium">
                        {formatCurrency(customer.balance)}
                      </td>
                      <td className="p-3 border text-center">
                        <button
                          onClick={() => sendWhatsAppReminders([customer.id])}
                          disabled={sendingMessages}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 mx-auto transition-colors"
                        >
                          <Send className="h-4 w-4" />
                          שלח
                        </button>
                      </td>
                    </tr>
                    {expandedCustomer === customer.id && (
                      <tr>
                        <td colSpan="5" className="border p-0">
                          <div className="bg-gray-50 p-4 space-y-3">
                            {customerInvoices[customer.id]?.length > 0 ? (
                              customerInvoices[customer.id].map((invoice) => (
                                <div 
                                  key={invoice.ID} 
                                  className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors"
                                >
                                  <div className="flex gap-3 items-center">
                                    <div className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-lg">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="font-medium">חשבונית #{invoice.DocumentNumber}</div>
                                      <div className="text-gray-500 text-sm">{invoice.Date}</div>
                                    </div>
                                  </div>
                                  <div className="text-red-500 font-medium text-lg">
                                    {formatCurrency(invoice.TotalPrice)}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-500 text-center py-4 bg-white rounded-lg border border-gray-200">
                                אין חשבוניות פתוחות
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan="3" className="p-3 border text-right">סה"כ חובות פתוחים:</td>
                  <td colSpan="2" className="p-3 border text-red-500 text-right text-lg">
                    {formatCurrency(getTotalDebt())}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {customers.map((customer) => (
              <div key={customer.id} className="bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => handleCustomerSelect(customer.id)}
                        className="h-4 w-4"
                      />
                      <div>
                        <h3 className="font-medium">{customer.name}</h3>
                        {customerInvoices[customer.id]?.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {customerInvoices[customer.id].length} חשבוניות
                          </span>
                        )}
                      </div>
                    </div>
                    {customerInvoices[customer.id]?.length > 0 && (
                      <button
                        onClick={() => toggleCustomerDetails(customer.id)}
                        className="flex items-center gap-1 text-blue-600 px-2 py-1 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        {expandedCustomer === customer.id ? 'סגור' : 'פתח'}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div dir="ltr" className="text-gray-600 text-sm">
                      {customer.phone2 || customer.phone}
                    </div>
                    <div className="text-red-500 font-bold">
                      {formatCurrency(customer.balance)}
                    </div>
                  </div>

                  {expandedCustomer === customer.id && (
                    <div className="mt-4 bg-gray-50 rounded p-3">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">חשבוניות פתוחות:</h4>
                      {customerInvoices[customer.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {customerInvoices[customer.id].map((invoice) => (
                            <div 
                              key={invoice.ID} 
                              className="flex justify-between items-center bg-white p-2 rounded border border-gray-100"
                            >
                              <div className="text-sm">
                                <div className="font-medium">#{invoice.DocumentNumber}</div>
                                <div className="text-gray-500 text-xs">{invoice.Date}</div>
                              </div>
                              <div className="text-red-500">
                                {formatCurrency(invoice.TotalPrice)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm text-center py-2">
                          אין חשבוניות פתוחות
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={() => sendWhatsAppReminders([customer.id])}
                    disabled={sendingMessages}
                    className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    שלח תזכורת בווטסאפ
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Summary */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">סה"כ חובות:</span>
                <span className="text-red-500 font-bold text-xl">{formatCurrency(getTotalDebt())}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {selectedCustomers.length} לקוחות נבחרו מתוך {customers.length}
                </span>
                {selectedCustomers.length > 0 && (
                  <button
                    onClick={() => sendWhatsAppReminders()}
                    disabled={sendingMessages}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    {sendingMessages ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        שולח {currentCustomerIndex + 1} מתוך {selectedCustomers.length}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        שלח לנבחרים
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Spacing for fixed bottom bar */}
          <div className="h-28" />
        </>
      )}
    </div>
  );
};

export default CustomerBalanceManager;