
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/base/Button';
import Input from '../../../components/base/Input';
import Checkbox from '../../../components/base/Checkbox';
import useForm from '../../../hooks/useForm';
import { apiRequest } from '../../../utils/api';

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: string;
  department: string | null;
  college: string | null;
  agreeToTerms: boolean;
}

export default function SignupPage() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fillTestData = () => {
    setValue('firstName', 'John');
    setValue('lastName', 'Doe');
    setValue('email', `test.user.${Date.now()}@example.com`);
    setValue('password', 'TestPassword123');
    setValue('confirmPassword', 'TestPassword123');
    setValue('userType', 'CITIZEN');
    setValue('department', null);
    setValue('college', null);
    setValue('agreeToTerms', true);
  };

  const navigate = useNavigate();
  
  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting, setError } = useForm<SignupFormData>(
    {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      userType: 'CITIZEN',
      department: null,
      college: null,
      agreeToTerms: false
    },
    {
      firstName: {
        required: true,
        minLength: 2
      },
      lastName: {
        required: true,
        minLength: 2
      },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      password: {
        required: true,
        minLength: 8,
        custom: (value: string) => {
          if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
          if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
          if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
          return null;
        }
      },
      // Removed userType validation since it's auto set
      department: {
        required: false
      },
      college: {
        required: false
      },
      confirmPassword: {
        required: true,
        custom: (value: string) => {
          if (value !== fields.password.value) return 'Passwords do not match';
          return null;
        }
      },
      agreeToTerms: {
        custom: (value: boolean) => {
          if (!value) return 'You must agree to the terms and conditions';
          return null;
        }
      }
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) return;

    setIsSubmitting(true);
    setShowErrorMessage(false);
    setShowSuccessMessage(false);

    try {
      const formData = getValues();
      console.log('Signup data:', formData);

      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          userType: formData.userType,
          department: formData.department,
          college: formData.college
        })
      });

      if (data && data.success) {
        console.log('Registration successful:', data);
        setShowSuccessMessage(true);

        // Store email for login page
        sessionStorage.setItem('lastRegisteredEmail', formData.email);

        // Redirect to login page
        setTimeout(() => {
          navigate('/auth/login');
        }, 1500);
        return;

      } else {
        const errorMsg = data?.message || 'Registration failed. Please try again.';

        // Handle specific error cases
        if (errorMsg.toLowerCase().includes('email') && errorMsg.toLowerCase().includes('exist')) {
          setError('email', 'This email is already registered');
        }

        setErrorMessage(errorMsg);
        setShowErrorMessage(true);
      }

    } catch (error) {
      console.error('Registration failed:', error);
      setErrorMessage('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setShowErrorMessage(true);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setShowErrorMessage(false), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-600 rounded-2xl flex items-center justify-center">
            <i className="ri-user-add-line text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
          <p className="text-gray-600">Join us today and get started</p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <i className="ri-check-circle-line"></i>
              <div>
                <div className="text-sm font-medium">Account created successfully!</div>
                <div className="text-xs mt-1">Redirecting to login page... You can now login with your credentials.</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {showErrorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <i className="ri-error-warning-line"></i>
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Info Message */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-800">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <i className="ri-information-line"></i>
              Registration Information
            </h3>
            <div className="text-xs space-y-1">
              <p><strong>🗄️ DATABASE REGISTRATION:</strong> Your account will be saved to the MySQL database.</p>
              <p>✅ Secure password hashing with bcrypt</p>
              <p>✅ Data validation and duplicate email checking</p>
              <p className="text-green-600 mt-2"><strong>NO localStorage - REAL database storage only!</strong></p>
              <button
                type="button"
                onClick={fillTestData}
                className="mt-2 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
              >
                Fill Test Data
              </button>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                name="firstName"
                id="firstName"
                value={fields.firstName.value}
                onChange={(e) => setValue('firstName', e.target.value)}
                error={fields.firstName.touched ? fields.firstName.error : ''}
                placeholder="John"
                required
                autoComplete="given-name"
                icon={<i className="ri-user-line"></i>}
              />
              <Input
                label="Last Name"
                type="text"
                name="lastName"
                id="lastName"
                value={fields.lastName.value}
                onChange={(e) => setValue('lastName', e.target.value)}
                error={fields.lastName.touched ? fields.lastName.error : ''}
                placeholder="Doe"
                required
                autoComplete="family-name"
                icon={<i className="ri-user-line"></i>}
              />
            </div>

            <Input
              label="Email address"
              type="email"
              name="email"
              id="email"
              value={fields.email.value}
              onChange={(e) => setValue('email', e.target.value)}
              error={fields.email.touched ? fields.email.error : ''}
              placeholder="john@example.com"
              required
              autoComplete="email"
              icon={<i className="ri-mail-line"></i>}
            />

            <div className="space-y-4">
              <div>
                <input
                  type="hidden"
                  id="userType"
                  name="userType"
                  value="CITIZEN"
                />
              </div>

              {/* Additional fields can be added here based on user type */}
              {fields.userType.value === 'BARANGAY_STAFF' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <i className="ri-information-line mr-1"></i>
                    Your account will need approval from an admin before you can access staff features.
                  </p>
                </div>
              )}
            </div>

            <Input
              label="Password"
              type="password"
              name="password"
              id="password"
              value={fields.password.value}
              onChange={(e) => setValue('password', e.target.value)}
              error={fields.password.touched ? fields.password.error : ''}
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
              icon={<i className="ri-lock-line"></i>}
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={fields.confirmPassword.value}
              onChange={(e) => setValue('confirmPassword', e.target.value)}
              error={fields.confirmPassword.touched ? fields.confirmPassword.error : ''}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
              icon={<i className="ri-lock-line"></i>}
            />

            <div className="space-y-3">
              <Checkbox
                id="agreeToTerms"
                name="agreeToTerms"
                label="I agree to the Terms of Service and Privacy Policy"
                checked={fields.agreeToTerms.value}
                onChange={(checked) => setValue('agreeToTerms', checked)}
              />
              {fields.agreeToTerms.touched && fields.agreeToTerms.error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  {fields.agreeToTerms.error}
                </p>
              )}
            </div>

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
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          {/* Login link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/auth/login" 
                className="font-medium text-green-600 hover:text-green-500 cursor-pointer"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
