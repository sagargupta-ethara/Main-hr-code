import React from 'react';
import { Users } from 'lucide-react';

const Contacts = () => {
  return (
    <div className="space-y-6" data-testid="contacts-page">
      <div>
        <h1 className="text-4xl tracking-tight font-bold text-slate-900 mb-2">Contacts</h1>
        <p className="text-sm text-slate-700 leading-relaxed">
          Contact management for HR SPOCs, interviewers, and vendor contacts
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
          <Users className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-2">
          Contact Management
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed max-w-md mx-auto">
          This module will help you manage HR SPOCs, interviewer details, vendor contacts, and
          stakeholder information.
        </p>
      </div>
    </div>
  );
};

export default Contacts;
