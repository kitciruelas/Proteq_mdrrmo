  
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/base/Button';
import Input from '../../../components/base/Input';
import useForm from '../../../hooks/useForm';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<ForgotPasswordFormData>(
    {
      email: ''
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      }
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAll()) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = getValues();
      console.log('Forgot password data:', formData);

      const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailSent(true);
        setShowSuccessMessage(true);
        // Redirect to OTP verification page after 2 seconds
        setTimeout(() => {
          navigate('/auth/verify-otp', { state: { email: formData.email } });
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to send verification code');
      }

    } catch (error) {
      console.error('Reset password failed:', error);
      alert('Failed to send verification code. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    setIsSubmitting(true);
    
    try {
      const formData = getValues();
      
      const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        throw new Error(data.message || 'Failed to resend verification code');
      }

    } catch (error) {
      console.error('Resend email failed:', error);
      alert('Failed to resend verification code. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-600 rounded-2xl flex items-center justify-center">
            <i className="ri-key-line text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {emailSent ? 'Check your email' : 'Forgot your password?'}
          </h1>
          <p className="text-gray-600">
            {emailSent
              ? 'We\'ve sent a verification code to your email address'
              : 'Enter your email address and we\'ll send you a code to reset your password'
            }
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <i className="ri-check-circle-line"></i>
              <span className="text-sm font-medium">
                {emailSent ? 'Verification code sent again!' : 'Verification code sent to your email!'}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!emailSent ? (
            <>
              {/* Reset Password Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Email address"
                  type="email"
                  name="email"
                  id="email"
                  value={fields.email.value}
                  onChange={(e) => setValue('email', e.target.value)}
                  error={fields.email.touched ? fields.email.error : ''}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  icon={<i className="ri-mail-line"></i>}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Sending verification code...
                    </>
                  ) : (
                    'Send verification code'
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Email Sent State */}
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <i className="ri-mail-check-line text-3xl text-green-600"></i>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    We sent a verification code to:
                  </p>
                  <p className="font-medium text-gray-900">{fields.email.value}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Didn't receive the code? Check your spam folder or
                  </p>

                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={handleResendEmail}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        Resending...
                      </>
                    ) : (
                      'Resend code'
                    )}
                  </Button>

                  <Link to="/auth/reset-password">
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                    >
                      Enter verification code
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Back to Login */}
          <div className="text-center mt-8 pt-6 border-t border-gray-100">
            <Link 
              to="/auth/login" 
              className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-500 cursor-pointer font-medium"
            >
              <i className="ri-arrow-left-line"></i>
              Back to sign in
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Still having trouble? Contact our{' '}
            <a href="mailto:support@example.com" className="text-purple-600 hover:text-purple-500 cursor-pointer">
              support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
