import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, Shield, AlertCircle, ImageIcon, X } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import showToast from '@shared/components/Toast';
import { driverApiService } from '../../services/driverService';

interface UploadedDoc {
  fileKey: string;
  preview: string; // local Object URL for preview
  name: string;
  size: number;
}

const KycScreen = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Upload state — now stores real file keys from MinIO
  const [documents, setDocuments] = useState<{
    licenseFront: UploadedDoc | null;
    licenseBack: UploadedDoc | null;
    vehicleRegistration: UploadedDoc | null;
  }>({
    licenseFront: null,
    licenseBack: null,
    vehicleRegistration: null,
  });

  // Upload progress
  const [uploading, setUploading] = useState<string | null>(null);

  // File input refs
  const licenseFrontRef = useRef<HTMLInputElement>(null);
  const licenseBackRef = useRef<HTMLInputElement>(null);
  const vehicleRegRef = useRef<HTMLInputElement>(null);

  const [vehicleInfo, setVehicleInfo] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    color: '',
    licensePlate: '',
    licenseNumber: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVehicleInfo(prev => ({ ...prev, [name]: value }));
  };

  // Category mapping for MinIO
  const CATEGORY_MAP: Record<string, string> = {
    licenseFront: 'license-front',
    licenseBack: 'license-back',
    vehicleRegistration: 'vehicle-registration',
  };

  const handleFileSelect = async (type: keyof typeof documents, file: File) => {
    if (!user?.id) {
      showToast.error('Không tìm thấy thông tin người dùng');
      return;
    }

    // Validate client-side
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showToast.error('Chỉ chấp nhận file JPEG, PNG, WebP hoặc PDF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('File quá lớn. Tối đa 5MB');
      return;
    }

    setUploading(type);
    try {
      const result = await driverApiService.uploadDocument(
        file,
        user.id,
        CATEGORY_MAP[type]
      );

      const fileData = result.data || result;
      const preview = URL.createObjectURL(file);

      setDocuments(prev => ({
        ...prev,
        [type]: {
          fileKey: fileData.fileKey,
          preview,
          name: file.name,
          size: file.size,
        },
      }));
      showToast.success(`Tải lên ${file.name} thành công!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      showToast.error(error.message || 'Tải lên thất bại');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveDoc = (type: keyof typeof documents) => {
    if (documents[type]?.preview) {
      URL.revokeObjectURL(documents[type]!.preview);
    }
    setDocuments(prev => ({ ...prev, [type]: null }));
  };

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click();
  };

  const allUploaded = documents.licenseFront && documents.licenseBack && documents.vehicleRegistration;
  const isFormValid = vehicleInfo.make && vehicleInfo.model && vehicleInfo.licensePlate && vehicleInfo.licenseNumber;

  const handleSubmit = async () => {
    if (!allUploaded || !isFormValid) {
      showToast.error('Vui lòng điền đầy đủ thông tin và tải lên tất cả giấy tờ');
      return;
    }

    setIsSubmitting(true);
    try {
      await driverApiService.createProfile({
        driverId: user?.id,
        firstName: user?.name?.split(' ')[0] || 'Tài xế',
        lastName: user?.name?.split(' ').slice(1).join(' ') || 'CAB',
        email: user?.email,
        phone: user?.phone || `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        dateOfBirth: '1990-01-01',
        licenseNumber: vehicleInfo.licenseNumber,
        licenseExpiryDate: '2030-01-01',
        vehicle: {
          make: vehicleInfo.make,
          model: vehicleInfo.model,
          year: parseInt(vehicleInfo.year) || 2020,
          color: vehicleInfo.color || 'Trắng',
          licensePlate: vehicleInfo.licensePlate
        },
        // Attach uploaded file keys for record
        documents: {
          licenseFront: documents.licenseFront!.fileKey,
          licenseBack: documents.licenseBack!.fileKey,
          vehicleRegistration: documents.vehicleRegistration!.fileKey,
        }
      });

      await updateProfile({ isVerified: true });
      showToast.success('Hồ sơ đã được duyệt và lưu trữ lên MinIO!');
      navigate('/driver/home');
    } catch (error) {
      console.error(error);
      showToast.error('Có lỗi xảy ra khi lưu hồ sơ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.isVerified) {
    navigate('/driver/home');
    return null;
  }

  // Reusable upload zone component
  const UploadZone = ({
    type,
    label,
    inputRef,
  }: {
    type: keyof typeof documents;
    label: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) => {
    const doc = documents[type];
    const isUploading = uploading === type;

    return (
      <div className="relative">
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(type, file);
            e.target.value = ''; // reset for re-select same file
          }}
        />

        {doc ? (
          /* Uploaded state — show preview */
          <div className="border-2 border-teal-500 bg-teal-50 rounded-2xl p-4 flex items-center gap-4 relative">
            {/* Preview thumbnail */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-teal-200 flex-shrink-0">
              {doc.preview && !doc.name.endsWith('.pdf') ? (
                <img src={doc.preview} alt={label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-teal-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <span className="font-medium text-teal-700 truncate">{label}</span>
              </div>
              <p className="text-xs text-teal-600 mt-1 truncate">{doc.name}</p>
              <p className="text-xs text-slate-500">{(doc.size / 1024).toFixed(0)} KB</p>
            </div>
            {/* Remove button */}
            <button
              onClick={() => handleRemoveDoc(type)}
              className="absolute top-2 right-2 w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-red-600" />
            </button>
          </div>
        ) : (
          /* Empty state — click to upload */
          <div
            onClick={() => !isUploading && triggerFileInput(inputRef)}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
              isUploading
                ? 'border-amber-400 bg-amber-50'
                : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-teal-400'
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-8 h-8 border-3 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                <span className="font-medium text-amber-700">Đang tải lên MinIO...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="font-medium text-slate-700">{label}</span>
                <span className="text-xs text-slate-400">JPEG, PNG, WebP, PDF • Tối đa 5MB</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

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
          <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-teal-500' : 'bg-slate-200'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-800">Bằng lái xe (GPLX)</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">Vui lòng chụp rõ nét, không bị lóa sáng và đầy đủ 4 góc của giấy tờ. File sẽ được lưu trữ trên MinIO Cloud Storage.</p>
            </div>

            <UploadZone type="licenseFront" label="Mặt trước GPLX" inputRef={licenseFrontRef} />
            <UploadZone type="licenseBack" label="Mặt sau GPLX" inputRef={licenseBackRef} />

            <button
              onClick={() => setStep(2)}
              disabled={!documents.licenseFront || !documents.licenseBack || uploading !== null}
              className="w-full py-4 mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
            >
              Tiếp tục
            </button>
          </div>
        ) : step === 2 ? (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-800">Giấy đăng ký xe (Cà vẹt)</h2>

            <UploadZone type="vehicleRegistration" label="Giấy đăng ký xe" inputRef={vehicleRegRef} />

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!allUploaded || uploading !== null}
                className="flex-[2] py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-800">Thông tin phương tiện</h2>

            {/* Uploaded documents summary */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-teal-700">📄 Giấy tờ đã tải lên MinIO:</p>
              {documents.licenseFront && (
                <p className="text-xs text-teal-600">✅ Mặt trước GPLX — {documents.licenseFront.name}</p>
              )}
              {documents.licenseBack && (
                <p className="text-xs text-teal-600">✅ Mặt sau GPLX — {documents.licenseBack.name}</p>
              )}
              {documents.vehicleRegistration && (
                <p className="text-xs text-teal-600">✅ Giấy đăng ký xe — {documents.vehicleRegistration.name}</p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số GPLX</label>
                <input type="text" name="licenseNumber" value={vehicleInfo.licenseNumber} onChange={handleInputChange} placeholder="VD: 790123456789" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hãng xe</label>
                  <input type="text" name="make" value={vehicleInfo.make} onChange={handleInputChange} placeholder="VD: Toyota" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dòng xe</label>
                  <input type="text" name="model" value={vehicleInfo.model} onChange={handleInputChange} placeholder="VD: Vios" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Biển số xe</label>
                  <input type="text" name="licensePlate" value={vehicleInfo.licensePlate} onChange={handleInputChange} placeholder="VD: 51F-123.45" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all font-bold uppercase" />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Màu sắc</label>
                  <input type="text" name="color" value={vehicleInfo.color} onChange={handleInputChange} placeholder="VD: Trắng" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="flex-[2] py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors flex justify-center items-center gap-2 cursor-pointer"
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
