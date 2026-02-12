import { Link } from "react-router-dom";

const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-stone-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-700">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Site Under Maintenance</h1>
            <p className="text-red-100 text-lg">We'll be back shortly</p>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            <p className="text-stone-700 dark:text-stone-300 text-lg mb-6 leading-relaxed">
              WeCare is currently undergoing scheduled maintenance to improve your experience. 
              We apologize for any inconvenience.
            </p>

            <div className="bg-stone-50 dark:bg-slate-800 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-3">What's happening?</h3>
              <ul className="text-left text-stone-600 dark:text-stone-400 space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>System updates and improvements</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Performance optimizations</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Security enhancements</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
              Your data is safe and will be available when we're back online.
            </p>

            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-rose-700 transition shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

          {/* Footer */}
          <div className="bg-stone-50 dark:bg-slate-800 px-8 py-4 border-t border-stone-200 dark:border-stone-700">
            <p className="text-xs text-stone-500 dark:text-stone-400 text-center">
              For urgent inquiries, please contact support at{" "}
              <a href="mailto:support@wecare.com" className="text-red-600 dark:text-red-400 hover:underline">
                support@wecare.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
