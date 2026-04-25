import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2,
  XCircle,
  UserCheck, 
  UserX, 
  FileText
} from 'lucide-react';
import showToast from '@shared/components/Toast';

// Mock Data
const mockUsers = [
  { id: '1', name: 'Nguyễn Văn A', email: 'a.nguyen@email.com', phone: '0901234567', role: 'driver', status: 'active', kyc: 'pending', joinedAt: '2023-10-15' },
  { id: '2', name: 'Lê Thị B', email: 'b.le@email.com', phone: '0912345678', role: 'customer', status: 'active', kyc: null, joinedAt: '2023-10-20' },
  { id: '3', name: 'Trần Văn C', email: 'c.tran@email.com', phone: '0923456789', role: 'driver', status: 'active', kyc: 'approved', joinedAt: '2023-09-05' },
  { id: '4', name: 'Phạm Thị D', email: 'd.pham@email.com', phone: '0934567890', role: 'customer', status: 'locked', kyc: null, joinedAt: '2023-11-10' },
  { id: '5', name: 'Hoàng Văn E', email: 'e.hoang@email.com', phone: '0945678901', role: 'driver', status: 'active', kyc: 'rejected', joinedAt: '2023-10-01' },
];

const UserManagementScreen = () => {
  const [users, setUsers] = useState(mockUsers);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredUsers = users.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.phone.includes(searchQuery);
    return matchRole && matchSearch;
  });

  const handleApproveKyc = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, kyc: 'approved' } : u));
    showToast.success('Đã duyệt KYC');
  };

  const handleToggleLock = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'locked' : 'active';
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    showToast.success(newStatus === 'active' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm tên, email, SĐT..."
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
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none cursor-pointer"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="customer">Khách hàng</option>
              <option value="driver">Tài xế</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Người dùng</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vai trò</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">KYC (Tài xế)</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày tham gia</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Hành động</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                // Skeleton Rows
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-10 bg-slate-100 rounded animate-pulse w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded animate-pulse w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded animate-pulse w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded animate-pulse w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-100 rounded animate-pulse w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${
                            user.role === 'driver' ? 'bg-indigo-500' : 'bg-teal-500'
                          }`}>
                            {user.name.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email} • {user.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'driver' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {user.role === 'driver' ? 'Tài xế' : 'Khách hàng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === 'driver' ? (
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${
                          user.kyc === 'approved' ? 'text-emerald-600' :
                          user.kyc === 'pending' ? 'text-amber-500' :
                          'text-red-500'
                        }`}>
                          {user.kyc === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                          {user.kyc === 'pending' && <FileText className="w-4 h-4" />}
                          {user.kyc === 'rejected' && <XCircle className="w-4 h-4" />}
                          {user.kyc === 'approved' ? 'Đã duyệt' : user.kyc === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.joinedAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-2">
                        {user.role === 'driver' && user.kyc === 'pending' && (
                          <button 
                            onClick={() => handleApproveKyc(user.id)}
                            className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors" 
                            title="Duyệt KYC"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleToggleLock(user.id, user.status)}
                          className={`${user.status === 'active' ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'} p-2 rounded-lg transition-colors`}
                          title={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {user.status === 'active' ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination mock */}
        <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Hiển thị <span className="font-medium">1</span> đến <span className="font-medium">{filteredUsers.length}</span> trong số <span className="font-medium">{filteredUsers.length}</span> kết quả
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50">
                  Trước
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-indigo-500 bg-indigo-50 text-sm font-medium text-indigo-600 z-10">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50">
                  Sau
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementScreen;
