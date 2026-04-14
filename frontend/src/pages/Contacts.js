import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Search, Phone, Mail, Building2, UserCheck, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TYPE_STYLES = {
  'Vendor': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'HR SPOC': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Candidate': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Interviewer (L1)': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Interviewer (L2)': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/contacts`, { withCredentials: true });
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchQuery || 
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.vendor && c.vendor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(contacts.map(c => c.type))];

  // Group contacts by type for summary
  const typeCounts = contacts.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="contacts-page">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-1">Contacts</h1>
        <p className="text-sm text-slate-400">{contacts.length} contacts from hiring data</p>
      </div>

      {/* Type Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="contacts-summary">
        {Object.entries(typeCounts).map(([type, count]) => {
          const style = TYPE_STYLES[type] || TYPE_STYLES['Candidate'];
          return (
            <div
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
              className={`${style.bg} border ${style.border} rounded-2xl p-4 cursor-pointer transition-all hover:opacity-80 ${
                filterType === type ? 'ring-1 ring-offset-0' : ''
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">{type}</p>
              <p className={`text-2xl font-bold ${style.text} font-mono`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" strokeWidth={1.5} />
            <input
              data-testid="contacts-search"
              type="text"
              placeholder="Search by name, vendor, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {uniqueTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(filterType === type ? 'all' : type)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  filterType === type
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden card-glow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Name</th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Type</th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Vendor</th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Email</th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Phone</th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Roles</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact, idx) => {
                const style = TYPE_STYLES[contact.type] || TYPE_STYLES['Candidate'];
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedContact(contact)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
                    data-testid={`contact-row-${idx}`}
                  >
                    <td className="py-4 px-6 text-sm text-white font-semibold">{contact.name}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text} border ${style.border}`}>
                        {contact.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-400">{contact.vendor || '-'}</td>
                    <td className="py-4 px-6 text-sm text-slate-400">
                      {contact.email ? (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-cyan-400" strokeWidth={1.5} />
                          {contact.email}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-400">
                      {contact.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-cyan-400" strokeWidth={1.5} />
                          {contact.phone}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-400">
                      {contact.roles?.length > 0 ? contact.roles.join(', ') : '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    No contacts found matching your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedContact(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 card-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedContact.name}</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                  (TYPE_STYLES[selectedContact.type] || TYPE_STYLES['Candidate']).bg
                } ${(TYPE_STYLES[selectedContact.type] || TYPE_STYLES['Candidate']).text} border ${
                  (TYPE_STYLES[selectedContact.type] || TYPE_STYLES['Candidate']).border
                }`}>
                  {selectedContact.type}
                </span>
              </div>
              <button onClick={() => setSelectedContact(null)} className="text-slate-400 hover:text-white transition-colors" data-testid="contact-modal-close">
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-4">
              {selectedContact.vendor && (
                <div className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <Building2 className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-slate-500">Vendor</p>
                    <p className="text-sm font-semibold text-white">{selectedContact.vendor}</p>
                  </div>
                </div>
              )}
              {selectedContact.email && (
                <div className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <Mail className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-semibold text-white">{selectedContact.email}</p>
                  </div>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <Phone className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-sm font-semibold text-white">{selectedContact.phone}</p>
                  </div>
                </div>
              )}
              {selectedContact.roles?.length > 0 && (
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-2">Associated Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.roles.map((role, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300">{role}</span>
                    ))}
                  </div>
                </div>
              )}
              {selectedContact.candidate_count && (
                <div className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <UserCheck className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-slate-500">Total Candidates Submitted</p>
                    <p className="text-sm font-semibold text-white">{selectedContact.candidate_count}</p>
                  </div>
                </div>
              )}
              {selectedContact.stage && (
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Current Stage</p>
                  <p className="text-sm font-semibold text-white">{selectedContact.stage}</p>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedContact(null)} className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all font-semibold">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
