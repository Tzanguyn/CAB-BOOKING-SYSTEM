import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import Button from '../../components/common/button';

const RegisterPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // State lưu dữ liệu form đăng ký
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: 'customer' // Mặc định là khách hàng
    });

    // Hàm xử lý khi nhập liệu (dùng chung cho cả input và select)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // Hàm submit
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Gọi API đăng ký
            await authService.register(formData);
            
            alert("Đăng ký thành công! Vui lòng đăng nhập.");
            
            // Đăng ký xong thì chuyển về trang login
            navigate('/customer/login');

        } catch (error: any) {
            console.error("Lỗi đăng ký:", error);
            const message = error.response?.data?.message || "Đăng ký thất bại, vui lòng kiểm tra lại thông tin!";
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Đăng Ký Tài Khoản</h2>

                <form onSubmit={handleRegister} className="space-y-4">
                    
                    {/* HỌ TÊN */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Họ và tên</label>
                        <input
                            name="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder="Nguyễn Văn A"
                            required
                        />
                    </div>

                    {/* EMAIL */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder="email@example.com"
                            required
                        />
                    </div>

                    {/* SỐ ĐIỆN THOẠI */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Số điện thoại</label>
                        <input
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder="0909xxxxxx"
                            required
                        />
                    </div>

                    {/* MẬT KHẨU */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Mật khẩu</label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder="******"
                            required
                            minLength={6} // Validate đơn giản độ dài
                        />
                    </div>

                    {/* NÚT SUBMIT */}
                    <div className="pt-2">
                        <Button type="submit" isLoading={loading}>
                            Đăng ký ngay
                        </Button>
                    </div>

                </form>

                <p className="mt-4 text-center text-sm text-gray-600">
                    Đã có tài khoản? <a href="/customer/login" className="text-blue-600 hover:underline">Đăng nhập</a>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;