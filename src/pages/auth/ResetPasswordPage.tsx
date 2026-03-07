import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import {
  usePasswordResetValidation,
  usePasswordReset,
  usePasswordStrengthValidator,
} from '@/hooks/usePasswordReset';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'validate' | 'reset' | 'success'>('validate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { validateToken, validating, error: validationError } = usePasswordResetValidation();
  const { resetPassword, loading: resetting, error: resetError, success } = usePasswordReset();
  const { validatePassword, score, feedback } = usePasswordStrengthValidator();

  // Validate token on mount or when token changes
  useEffect(() => {
    if (!token) {
      setStep('validate');
      return;
    }

    let mounted = true;
    (async () => {
      const result = await validateToken(token);
      if (!mounted) return;
      if (result.valid) {
        setEmail(result.email || '');
        setStep('reset');
      } else {
        setStep('validate');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, validateToken]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      alert('Invalid or missing reset token');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      alert('Password does not meet requirements');
      return;
    }

    const result = await resetPassword(token, password);
    if (result.success) {
      setStep('success');
      // Redirect to sign-in after 3 seconds
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    }
  };

  // Token validation step
  if (step === 'validate') {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4'>
        <div className='w-full max-w-md'>
          <div className='bg-white rounded-2xl shadow-lg p-8'>
            <div className='flex justify-center mb-6'>
              <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
                <Lock className='w-8 h-8 text-white' />
              </div>
            </div>

            <h1 className='text-3xl font-bold text-center text-gray-900 mb-2'>
              Reset Password
            </h1>
            <p className='text-center text-gray-500 mb-8'>
              Check your email for a password reset link
            </p>

            {validationError && (
              <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3'>
                <AlertCircle className='w-5 h-5 text-red-600 flex-shrink-0 mt-0.5' />
                <div>
                  <p className='font-medium text-red-900'>Validation Error</p>
                  <p className='text-sm text-red-700 mt-1'>{validationError.message}</p>
                </div>
              </div>
            )}

            {!token && (
              <p className='text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6'>
                No reset token found. Please check your email for the password reset link.
              </p>
            )}

            {validating && (
              <div className='flex items-center justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500'></div>
              </div>
            )}

            <div className='space-y-4'>
              <button
                onClick={() => navigate('/')}
                className='w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
              >
                <ArrowLeft className='w-4 h-4' />
                Back to Home
              </button>

              <div className='text-center text-sm text-gray-500'>
                Remember your password?{' '}
                <button
                  onClick={() => navigate('/')}
                  className='text-blue-600 hover:text-blue-700 font-medium'
                >
                  Sign in here
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password reset step
  if (step === 'reset') {
    const passwordStrength = validatePassword(password);
    const passwordsMatch = password && confirmPassword && password === confirmPassword;

    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4'>
        <div className='w-full max-w-md'>
          <div className='bg-white rounded-2xl shadow-lg p-8'>
            <div className='flex justify-center mb-6'>
              <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
                <Lock className='w-8 h-8 text-white' />
              </div>
            </div>

            <h1 className='text-3xl font-bold text-center text-gray-900 mb-2'>
              Create New Password
            </h1>
            <p className='text-center text-gray-500 mb-8'>
              Enter a strong password for your account
            </p>

            {resetError && (
              <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3'>
                <AlertCircle className='w-5 h-5 text-red-600 flex-shrink-0 mt-0.5' />
                <div>
                  <p className='font-medium text-red-900'>Error</p>
                  <p className='text-sm text-red-700 mt-1'>{resetError.message}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className='space-y-4'>
              {/* Email Display (Read-only) */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Email</label>
                <div className='flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg'>
                  <Mail className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>{email}</span>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  New Password
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                    placeholder='Enter strong password'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'
                  >
                    {showPassword ? (
                      <EyeOff className='w-5 h-5' />
                    ) : (
                      <Eye className='w-5 h-5' />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className='mt-3 space-y-2'>
                    <div className='flex gap-1'>
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 rounded-full flex-1 transition-colors ${
                            i < score
                              ? score <= 2
                                ? 'bg-red-500'
                                : score <= 3
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className='text-xs font-medium text-gray-600'>
                      {score <= 2 ? 'Weak' : score <= 3 ? 'Fair' : 'Strong'} password
                    </p>
                  </div>
                )}

                {/* Feedback */}
                {feedback.length > 0 && (
                  <div className='mt-3 space-y-1'>
                    {feedback.map((item, idx) => (
                      <p key={idx} className='text-xs text-amber-700 flex items-center gap-1'>
                        <span className='inline-block w-1 h-1 bg-amber-500 rounded-full'></span>
                        {item}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Confirm Password
                </label>
                <div className='relative'>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                      confirmPassword && !passwordsMatch
                        ? 'border-red-200 focus:ring-red-500'
                        : 'border-gray-200 focus:ring-blue-500'
                    }`}
                    placeholder='Confirm password'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='w-5 h-5' />
                    ) : (
                      <Eye className='w-5 h-5' />
                    )}
                  </button>
                </div>

                {confirmPassword && !passwordsMatch && (
                  <p className='mt-2 text-xs text-red-600'>Passwords do not match</p>
                )}

                {confirmPassword && passwordsMatch && (
                  <p className='mt-2 text-xs text-green-600 flex items-center gap-1'>
                    <CheckCircle className='w-4 h-4' />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                disabled={
                  !passwordStrength.isValid || !passwordsMatch || resetting || validating
                }
                className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                  !passwordStrength.isValid || !passwordsMatch || resetting || validating
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg transform hover:scale-105'
                }`}
              >
                {resetting ? 'Resetting password...' : 'Reset Password'}
              </button>
            </form>

            {/* Navigation Links */}
            <div className='mt-8 pt-8 border-t border-gray-200 space-y-4'>
              <div className='text-center text-sm text-gray-600'>
                Remember your password again?{' '}
                <button
                  onClick={() => navigate('/')}
                  className='text-blue-600 hover:text-blue-700 font-medium'
                >
                  Sign in
                </button>
              </div>
              <div className='text-center text-sm text-gray-600'>
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/')}
                  className='text-blue-600 hover:text-blue-700 font-medium'
                >
                  Sign up
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success step
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>
        <div className='bg-white rounded-2xl shadow-lg p-8 text-center'>
          <div className='flex justify-center mb-6'>
            <div className='w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-pulse'>
              <CheckCircle className='w-8 h-8 text-white' />
            </div>
          </div>

          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Password Reset Successful</h1>
          <p className='text-gray-500 mb-6'>
            Your password has been successfully reset. You will be redirected to the sign-in page
            shortly.
          </p>

          <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-8'>
            <p className='text-sm text-green-800'>
              You can now sign in with your new password.
            </p>
          </div>

          <div className='space-y-4'>
            <button
              onClick={() => navigate('/')}
              className='w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg transform hover:scale-105 transition-all'
            >
              Go to Sign In
            </button>

            <button
              onClick={() => navigate('/')}
              className='w-full py-2.5 rounded-lg font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors'
            >
              Back to Home
            </button>
          </div>

          <p className='mt-6 text-xs text-gray-500'>
            Redirecting to sign-in in 3 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
