import { z } from 'zod';

// ===== Shared Zod Schemas for Auth Forms =====

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(128, 'Mật khẩu quá dài'),
  confirmPassword: z
    .string()
    .min(1, 'Xác nhận mật khẩu không được để trống'),
  firstName: z
    .string()
    .min(1, 'Họ không được để trống')
    .max(50, 'Họ quá dài'),
  lastName: z
    .string()
    .min(1, 'Tên không được để trống')
    .max(50, 'Tên quá dài'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+84|0)\d{9,10}$/.test(val),
      'Số điện thoại không hợp lệ (VD: 0912345678)'
    ),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .length(6, 'Mã xác thực phải có 6 chữ số')
    .regex(/^\d{6}$/, 'Mã xác thực chỉ gồm chữ số'),
});

export const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống'),
  mfaCode: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{6}$/.test(val), 'Mã MFA phải có 6 chữ số'),
});

// Type inference from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;
export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;
