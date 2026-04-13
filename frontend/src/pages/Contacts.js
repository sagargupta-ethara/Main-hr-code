import React from 'react';
import { Users } from 'lucide-react';

const Contacts = () => {
  return (
    <div className="space-y-6" data-testid="contacts-page">
      <div>
        <h1 className="text-5xl font-bold text-white mb-2">Contacts</h1>
        <p className="text-sm text-slate-400">
          Contact management for HR SPOCs, interviewers, and vendor contacts
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center card-glow">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-2xl border border-cyan-500/20 mb-6">
          <Users className="w-10 h-10 text-cyan-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">
          Contact Management
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
          This module will help you manage HR SPOCs, interviewer details, vendor contacts, and
          stakeholder information.
        </p>
      </div>
    </div>
  );
};

export default Contacts;
