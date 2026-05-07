import { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';

const mockLogs = [
  { id: '1', timestamp: '2023-10-25 10:45:12', level: 'error', service: 'payment-service', message: 'Failed to process payment via Stripe', traceId: 'tr_123456', user: 'customer_01' },
  { id: '2', timestamp: '2023-10-25 10:42:05', level: 'info', service: 'auth-service', message: 'Admin login successful', traceId: 'auth_992', user: 'admin_root' },
  { id: '3', timestamp: '2023-10-25 10:30:11', level: 'warn', service: 'pricing-service', message: 'Surge multiplier unusually high', traceId: 'pr_551', user: 'system' },
  { id: '4', timestamp: '2023-10-25 10:15:00', level: 'info', service: 'ride-service', message: 'Ride completed', traceId: 'rd_882', user: 'driver_05' },
  { id: '5', timestamp: '2023-10-25 09:55:22', level: 'error', service: 'matching-service', message: 'Timeout finding driver', traceId: 'mt_001', user: 'system' },
  { id: '6', timestamp: '2023-10-25 09:10:45', level: 'info', service: 'user-service', message: 'New customer registered', traceId: 'us_773', user: 'customer_02' },
];

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'warn': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'info': return <Info className="w-5 h-5 text-blue-500" />;
    case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    default: return <Clock className="w-5 h-5 text-slate-500" />;
  }
};

const getLevelBadgeClass = (level: string) => {
  switch (level) {
    case 'error': return 'bg-red-100 text-red-800 border-red-200';
    case 'warn': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'success': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

const AuditLogsScreen = () => {
  const [logs] = useState(mockLogs);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        log.traceId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchLevel && matchSearch;
  });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-shrink-0">
        <div className="relative flex-1 w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm log message, trace id, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="block w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none cursor-pointer"
            >
              <option value="all">Tất cả Level</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trace ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 font-mono text-sm">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded animate-pulse w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-64"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"></div></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-sans">
                    Không tìm thấy log nào
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-slate-500">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        <span className={`px-2.5 py-0.5 border rounded-md text-xs uppercase font-bold tracking-wider ${getLevelBadgeClass(log.level)}`}>
                          {log.level}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-indigo-600 font-bold">
                      {log.service}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {log.message}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-500">
                      {log.traceId}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-500">
                      {log.user}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-sans">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Connected to Log Stream (Mock)
          </div>
          <div>Total: {filteredLogs.length} events</div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsScreen;
