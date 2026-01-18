// src/pages/Auth/LoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';

import Button from '../../components/common/button';

const LoginPage = () => {
    const [loading, setLoading] = useState(false);

    // State lưu dữ liệu nhập vào
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const navigate = useNavigate();

    // Hàm xử lý khi gõ phím
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            // Sửa: Dùng name thay vì type để mapping chính xác hơn
            [e.target.name]: e.target.value
        });
    };

    // Hàm xử lý khi submit form
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authService.login(formData);

            if (response.accessToken) {
                localStorage.setItem('accessToken', response.accessToken);
                // Kiểm tra xem response trả về refreshToken hay refresh_token để lưu đúng key
                localStorage.setItem('refreshToken', response.refreshToken);

                alert(`Đăng nhập thành công! Xin chào user ID: ${response.user?.id}`);

                // Điều hướng về trang Dashboard hoặc trang chủ
                navigate('/customer/home');
            }

        } catch (error: any) {
            console.error("Lỗi đăng nhập:", error);
            const message = error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!";
            alert("Thất bại: " + message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Đăng Nhập</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* INPUT EMAIL */}
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                            <input
                                name="email"  // QUAN TRỌNG: Thêm name để khớp với state
                                type="email"
                                value={formData.email} // QUAN TRỌNG: Gắn giá trị từ state (Controlled Component)
                                onChange={handleChange} // QUAN TRỌNG: Gắn hàm xử lý sự kiện
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                placeholder="nhapemail@example.com"
                                required
                            />
                        </div>

                        {/* INPUT PASSWORD */}
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Mật khẩu</label>
                            <input
                                name="password" // QUAN TRỌNG: Thêm name
                                type="password"
                                value={formData.password} // QUAN TRỌNG: Gắn giá trị
                                onChange={handleChange} // QUAN TRỌNG: Gắn hàm
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                placeholder="******"
                                required
                            />
                        </div>

                        <Button type="submit" isLoading={loading}>
                            Đăng nhập ngay
                        </Button>
                    </form>

                    <p className="mt-4 text-center text-sm text-gray-600">
                        Chưa có tài khoản? <a href="/customer/register" className="text-blue-600 hover:underline">Đăng ký</a>
                    </p>
                </div>
            </div>
        </>

    );
};

export default LoginPage;