import React from 'react';
import { Building2 } from 'lucide-react';

const Clients = () => {
  return (
    <div className="space-y-6" data-testid="clients-page">
      <div>
        <h1 className="text-4xl tracking-tight font-bold text-slate-900 mb-2">Clients</h1>
        <p className="text-sm text-slate-700 leading-relaxed">
          Client management functionality coming soon
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
          <Building2 className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-2">
          Client Management
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed max-w-md mx-auto">
          This module will help you manage client relationships, track client-specific requirements, and
          monitor vendor assignments per client.
        </p>
      </div>
    </div>
  );
};

export default Clients;
