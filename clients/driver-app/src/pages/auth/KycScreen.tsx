import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import showToast from '@shared/components/Toast';

const KycScreen = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [documents, setDocuments] = useState({
    licenseFront: false,
    licenseBack: false,
    vehicleRegistration: false,
  });

  const handleMockUpload = (type: keyof typeof documents) => {
    // Simulate upload delay
    setTimeout(() => {
      setDocuments(prev => ({ ...prev, [type]: true }));
      showToast.success('Tải lên thành công');
    }, 800);
  };

  const allUploaded = documents.licenseFront && documents.licenseBack && documents.vehicleRegistration;

  const handleSubmit = async () => {
    if (!allUploaded) return;
    
    setIsSubmitting(true);
    try {
      // Mock API call to approve KYC instantly for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1500));
      await updateProfile({ isVerified: true });
      showToast.success('Hồ sơ đã được duyệt!');
      navigate('/driver/home');
    } catch (error) {
      showToast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.isVerified) {
    navigate('/driver/home');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 pt-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
          <Shield className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Xác thực tài xế</h1>
          <p className="text-sm text-slate-500">Hoàn tất hồ sơ để bắt đầu nhận chuyến</p>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-teal-500' : 'bg-slate-200'}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-teal-500' : 'bg-slate-200'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-800">Bằng lái xe (GPLX)</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">Vui lòng chụp rõ nét, không bị lóa sáng và đầy đủ 4 góc của giấy tờ.</p>
            </div>

            <div 
              onClick={() => handleMockUpload('licenseFront')}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${documents.licenseFront ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
            >
              {documents.licenseFront ? (
                <CheckCircle2 className="w-10 h-10 text-teal-500" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400" />
              )}
              <span className="font-medium text-slate-700">{documents.licenseFront ? 'Mặt trước (Đã tải lên)' : 'Mặt trước GPLX'}</span>
            </div>

            <div 
              onClick={() => handleMockUpload('licenseBack')}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${documents.licenseBack ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
            >
              {documents.licenseBack ? (
                <CheckCircle2 className="w-10 h-10 text-teal-500" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400" />
              )}
              <span className="font-medium text-slate-700">{documents.licenseBack ? 'Mặt sau (Đã tải lên)' : 'Mặt sau GPLX'}</span>
            </div>

            <button 
              onClick={() => setStep(2)}
              disabled={!documents.licenseFront || !documents.licenseBack}
              className="w-full py-4 mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
            >
              Tiếp tục
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-800">Giấy đăng ký xe (Cà vẹt)</h2>
            
            <div 
              onClick={() => handleMockUpload('vehicleRegistration')}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${documents.vehicleRegistration ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
            >
              {documents.vehicleRegistration ? (
                <CheckCircle2 className="w-10 h-10 text-teal-500" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400" />
              )}
              <span className="font-medium text-slate-700">{documents.vehicleRegistration ? 'Đã tải lên' : 'Giấy đăng ký xe'}</span>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Quay lại
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!allUploaded || isSubmitting}
                className="flex-[2] py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Gửi hồ sơ'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KycScreen;
