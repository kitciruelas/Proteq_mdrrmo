
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/base/Button';
import Input from '../../../components/base/Input';
import Checkbox from '../../../components/base/Checkbox';
import useForm from '../../../hooks/useForm';
import { apiRequest } from '../../../utils/api';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<LoginFormData>(
    {
      email: '',
      password: '',
      rememberMe: false
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      password: {
        required: true,
        minLength: 6
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
      console.log('Login data:', formData);

      let data = null;
      let userData = null;
      let userType = null;

      // Try general user login first for all emails (since most users are general users)
      console.log('Attempting general user login first...');
      data = await apiRequest('/auth/login/user', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      // Check if general user login successful
      if (data && data.success) {
        console.log('General user login successful:', data);
        userData = {
          ...data.user,
          role: 'user',
          userType: 'user',
          token: data.token // Add the token to user data
        };
        userType = 'user';
      } else {
        console.log('General user login failed, trying staff login...');

        // Try staff login as fallback
        data = await apiRequest('/auth/login/staff', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        if (data && data.success) {
          console.log('Staff login successful:', data);
          userData = {
            ...data.staff,
            role: 'staff',
            userType: 'staff',
            token: data.token // Add the token to user data
          };
          userType = 'staff';
        } else {
          console.log('Staff login also failed:', data);
        }
      }

      if (userData) {
        setShowSuccessMessage(true);
        console.log(`Login successful for ${userType} user:`, userData);

        // Store user data
        if (formData.rememberMe) {
          localStorage.setItem('userInfo', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('userInfo', JSON.stringify(userData));
        }

        // Notify components of auth state change
        window.dispatchEvent(new Event('authStateChanged'));

        // Redirect based on user type
        setTimeout(() => {
          if (userType === 'staff') {
            console.log('Redirecting staff user to staff dashboard');
            navigate('/staff');
          } else if (userType === 'user') {
            console.log('Redirecting general user to home page');
            navigate('/');
          } else if (userData.role === 'admin') {
            console.log('Redirecting admin user to admin dashboard');
            navigate('/admin/dashboard');
          } else {
            console.log('Unknown user type, redirecting to home page');
            navigate('/');
          }
        }, 1500);
        return;
      }

      // Handle specific error cases
      if (data && data.message) {
        setErrorMessage(data.message);
      } else {
        setErrorMessage('Login failed. Please check your credentials and try again.');
      }
      setShowErrorMessage(true);

    } catch (error) {
      console.error('Login failed:', error);
      setErrorMessage('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setShowErrorMessage(true);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setShowErrorMessage(false), 5000);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-2xl flex items-center justify-center">
            <i className="ri-lock-line text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-gray-600">Please sign in to your account</p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <i className="ri-check-circle-line"></i>
              <span className="text-sm font-medium">Login successful! Redirecting to dashboard...</span>
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

      
        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email address"
              type="email"
              name="email"
              id="email"
              value={fields.email.value}
              onChange={(e) => setValue('email', e.target.value)}
              error={fields.email.touched ? fields.email.error : ''}
              placeholder="Enter your email"
              required
              autoComplete="email"
              icon={<i className="ri-mail-line"></i>}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              id="password"
              value={fields.password.value}
              onChange={(e) => setValue('password', e.target.value)}
              error={fields.password.touched ? fields.password.error : ''}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              icon={<i className="ri-lock-line"></i>}
            />

            <div className="flex items-center justify-between">
              <Checkbox
                id="rememberMe"
                name="rememberMe"
                label="Remember me"
                checked={fields.rememberMe.value}
                onChange={(checked) => setValue('rememberMe', checked)}
              />
              <Link 
                to="/auth/forgot-password" 
                className="text-sm text-blue-600 hover:text-blue-500 cursor-pointer"
              >
                Forgot password?
              </Link>
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>



          {/* Sign up link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/auth/signup" 
                className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
