
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from '../../components/Navbar';
import { getAuthState, type UserData } from '../../utils/auth';
import { publicApi } from '../../utils/api';

export default function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showHotlineModal, setShowHotlineModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [stats, setStats] = useState({
    responders: 0,
    evacuationCenters: 0,
    residentsCovered: 0,
    totalIncidents: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication state using the new utility
    const authState = getAuthState();
    setIsLoggedIn(authState.isAuthenticated);
    setUserData(authState.userData);

    // Redirect staff users to their dashboard
    if (authState.isAuthenticated && authState.userType === 'staff') {
      navigate('/staff');
      return;
    }

    // Listen for storage changes to update authentication state
    const handleStorageChange = () => {
      const newAuthState = getAuthState();
      setIsLoggedIn(newAuthState.isAuthenticated);
      setUserData(newAuthState.userData);
      
      // Redirect staff users to their dashboard
      if (newAuthState.isAuthenticated && newAuthState.userType === 'staff') {
        navigate('/staff');
        return;
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    window.addEventListener('authStateChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleStorageChange);
    };
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      setStatsError(null);
      try {
        const response = await publicApi.getHomeStats();
        if (response.success) {
          const apiStats = response.stats as any; // Type assertion for API response
          setStats({
            responders: apiStats.staff?.total || 0,
            evacuationCenters: apiStats.evacuation_centers?.total || 0,
            residentsCovered: apiStats.users?.total || 0, // Map users.total to residentsCovered
            totalIncidents: apiStats.incidents?.total || 0,
          });
        } else {
          setStatsError('Failed to load stats');
        }
      } catch (error) {
        setStatsError('Failed to load stats');
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Hotline data for MDRRMO Padre Garcia, Batangas
  const hotlines = [
    {
      name: "MDRRMO",
      description: "Municipal Disaster Risk Reduction & Management Office",
      number: "(043) 311.2935 | 703.2646 | 0917.133.9605",
      icon: "ri-shield-cross-line",
      priority: "high"
    },
    {
      name: "PNP",
      description: "Municipal Police Station",
      number: "(043) 724.7026 | 0915.254.2577",
      icon: "ri-police-car-line",
      priority: "high"
    },
    {
      name: "BFP",
      description: "Municipal Fire Station",
      number: "(043) 312.1102 | 0915.602.4435",
      icon: "ri-fire-line",
      priority: "high"
    },
    {
      name: "RHU I",
      description: "Municipal Health Office",
      number: "(043) 740.1338 | 0908.280.1497",
      icon: "ri-hospital-line",
      priority: "medium"
    },
    {
      name: "MSWDO",
      description: "Municipal Social Welfare & Development Office",
      number: "(043) 312.1367",
      icon: "ri-community-line",
      priority: "medium"
    },
    {
      name: "MVM Hospital",
      description: "Rosario District Hospital",
      number: "(043) 312.0411",
      icon: "ri-hospital-fill",
      priority: "medium"
    },
    {
      name: "BATELEC II - AREA II",
      description: "Batangas II Electric Cooperative Inc.",
      number: "0917.550.0754 | 0998.548.6153",
      icon: "ri-flashlight-line",
      priority: "medium"
    },
    {
      name: "PRC",
      description: "Philippine Red Cross Batangas Chapter - Lipa City Branch",
      number: "(043) 740.0768 | 0917.142.9378",
      icon: "ri-first-aid-kit-line",
      priority: "medium"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Navbar isAuthenticated={isLoggedIn} userData={userData} />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Hero Background with Image */}
        <div className="relative h-[480px] md:h-[640px] bg-gradient-to-r from-blue-900/90 to-blue-800/80">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/rosario-hero.png')"
            }}
          ></div>
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/85 to-blue-800/75"></div>
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              {isLoggedIn ? (
                // Authenticated user hero
                <div className="text-left">
                  {/* Logo/Icon */}
                  <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl mb-4 md:mb-6 shadow-lg">
                    <i className="ri-shield-check-line text-2xl md:text-3xl text-blue-600"></i>
                  </div>

                  {/* Main Title */}
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight">
                    Welcome back to
                    <span className="block text-yellow-300">ProteQ Emergency Hub</span>
                  </h1>

                  {/* Description */}
                  <p className="text-base md:text-xl text-blue-100 max-w-2xl mb-6 md:mb-8 leading-relaxed">
                    Your comprehensive emergency management dashboard is ready.
                    Access real-time incident tracking, evacuation routing, and safety protocols.
                  </p>
                </div>
              ) : (
                // Non-authenticated user hero 
                <div className="text-left">
                  {/* Philippine Flag and MDRRMO Logo */}
                  <div className="flex items-center mb-4 md:mb-6">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-xl flex items-center justify-center mr-4 shadow-lg">
                      <i className="ri-government-line text-2xl md:text-3xl text-blue-600"></i>
                    </div>
                    <div className="w-14 h-10 md:w-16 md:h-12 bg-gradient-to-b from-blue-500 via-white to-red-500 rounded-lg shadow-lg mr-4"></div>
                  </div>

                  {/* MDRRMO Title */}
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">
                    Municipal Disaster Risk Reduction
                    <span className="block text-yellow-300">& Management Office</span>
                  </h1>

                  {/* Location */}
                  <h2 className="text-2xl md:text-3xl font-semibold text-blue-200 mb-4 md:mb-6">
                    Rosario, Batangas
                  </h2>

                  {/* Description */}
                  <p className="text-base md:text-xl text-blue-100 max-w-3xl mb-6 md:mb-8 leading-relaxed">
                    Committed to protecting and serving our community through comprehensive disaster preparedness,
                    rapid emergency response, and proactive public safety management.
                  </p>

                  {/* Call to Action */}
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    <a
                      href="#services"
                      className="bg-yellow-500 hover:bg-yellow-400 text-blue-900 px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-base md:text-lg transition-colors shadow-lg"
                    >
                      Emergency Services
                    </a>
                    <button
                      onClick={() => setShowHotlineModal(true)}
                      className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-base md:text-lg transition-colors shadow-lg"
                    >
                      Emergency Hotline
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div id="services" className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              {isLoggedIn ? `Welcome back, ${userData?.firstName || 'User'}!` : 'Emergency Services'}
            </h2>
            <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-12">
              {isLoggedIn ? 'Access your emergency management tools' : 'Comprehensive disaster risk reduction and emergency response services for Rosario, Batangas'}
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {isLoggedIn ? (
              // Authenticated user content
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
                {userData?.userType === 'staff' && (
                  <Link
                    to="/staff"
                    className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-purple-200 transition-all">
                      <i className="ri-dashboard-3-line text-2xl md:text-3xl text-purple-600"></i>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">Staff Dashboard</h3>
                    <p className="text-gray-600 mb-4 md:mb-6">Access your staff dashboard with emergency management tools</p>
                    <div className="flex items-center text-purple-600 group-hover:text-purple-700">
                      <span className="font-semibold">Go to Dashboard</span>
                      <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </Link>
                )}
                
                <Link
                  to="/incident-report"
                  className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-red-200 transition-all">
                    <i className="ri-error-warning-line text-2xl md:text-3xl text-red-600"></i>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">Report Incident</h3>
                  <p className="text-gray-600 mb-4 md:mb-6">Submit emergency incidents and safety concerns with real-time tracking</p>
                  <div className="flex items-center text-red-600 group-hover:text-red-700">
                    <span className="font-semibold">Report Now</span>
                    <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
                  </div>
                </Link>

                <Link
                  to="/evacuation-center"
                  className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-blue-200 transition-all">
                    <i className="ri-building-2-line text-2xl md:text-3xl text-blue-600"></i>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">Evacuation Centers</h3>
                  <p className="text-gray-600 mb-4 md:mb-6">Find nearby evacuation centers with real-time capacity and status updates</p>
                  <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                    <span className="font-semibold">View Centers</span>
                    <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
                  </div>
                </Link>

                <Link
                  to="/safety-protocols"
                  className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-green-200 transition-all">
                    <i className="ri-shield-check-line text-2xl md:text-3xl text-green-600"></i>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">Safety Protocols</h3>
                  <p className="text-gray-600 mb-4 md:mb-6">Access comprehensive emergency procedures and safety guidelines</p>
                  <div className="flex items-center text-green-600 group-hover:text-green-700">
                    <span className="font-semibold">View Protocols</span>
                    <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
                  </div>
                </Link>
              </div>
            ) : (
              // Non-authenticated user content - MDRRMO Services
              <>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
                  <Link
                    to="/evacuation-center"
                    className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-blue-200 transition-all">
                      <i className="ri-building-2-line text-2xl md:text-3xl text-blue-600"></i>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">Evacuation Centers</h3>
                    <p className="text-gray-600 mb-4 md:mb-6">View available evacuation centers in Rosario, Batangas with capacity and contact information</p>
                    <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                      <span className="font-semibold">View Centers</span>
                      <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </Link>

                  <Link
                    to="/safety-protocols"
                    className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-green-200 transition-all">
                      <i className="ri-shield-check-line text-2xl md:text-3xl text-green-600"></i>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">Safety Protocols</h3>
                    <p className="text-gray-600 mb-4 md:mb-6">Access emergency procedures and safety guidelines for various disaster scenarios</p>
                    <div className="flex items-center text-green-600 group-hover:text-green-700">
                      <span className="font-semibold">View Protocols</span>
                      <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </Link>

                  <Link
                    to="/incident-report"
                    className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-red-200 transition-all">
                      <i className="ri-error-warning-line text-2xl md:text-3xl text-red-600"></i>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">Report Incident</h3>
                    <p className="text-gray-600 mb-4 md:mb-6">Report emergencies and safety concerns to MDRRMO Rosario</p>
                    <div className="flex items-center text-red-600 group-hover:text-red-700">
                      <span className="font-semibold">Report Now</span>
                      <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </Link>
                </div>

                {/* Authentication CTA */}
                <div className="text-center bg-blue-50 border border-blue-200 rounded-xl p-6 md:p-8">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Join Our Emergency Response Network</h3>
                  <p className="text-gray-600 mb-5 md:mb-6">Sign up to access advanced features, submit reports, and receive real-time emergency alerts for Rosario, Batangas</p>
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                    <Link
                      to="/auth/signup"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 md:px-8 rounded-lg transition-all duration-200 font-semibold shadow-lg"
                    >
                      Create Account
                    </Link>
                    <Link
                      to="/auth/login"
                      className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 md:px-8 rounded-lg transition-all duration-200 font-semibold"
                    >
                      Sign In
                    </Link>
                  </div>
                  <div className="mt-3 md:mt-4">
                    <Link
                      to="/auth/forgot-password"
                      className="inline-flex items-center text-gray-500 hover:text-blue-600 transition-colors text-sm"
                    >
                      <i className="ri-key-line mr-2"></i>
                      Forgot your password?
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <section className="bg-gradient-to-b from-white to-blue-50 py-14 md:py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: 'ri-timer-flash-line', title: 'Rapid Response', desc: 'Coordinated, time-critical incident handling' },
              { icon: 'ri-route-line', title: 'Evacuation Routes', desc: 'Optimized, real-time routing for safety' },
              { icon: 'ri-shield-star-line', title: 'Safety Protocols', desc: 'Up-to-date, practical safety guidance' },
              { icon: 'ri-bar-chart-2-line', title: 'Live Insights', desc: 'Data-driven decisions and monitoring' }
            ].map((f, i) => (
              <div key={i} className="bg-white/70 backdrop-blur border border-gray-200 rounded-xl p-5 md:p-6 hover:shadow-lg transition-all">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3 md:mb-4">
                  <i className={`${f.icon} text-xl md:text-2xl`}></i>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{f.title}</h4>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-14 md:py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {loadingStats ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-5 md:p-6">
                  <div className="text-2xl md:text-3xl font-bold text-blue-700 mb-1 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-16 mx-auto"></div>
                  </div>
                  <div className="text-gray-600 text-sm">
                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : statsError ? (
            <div className="text-center text-gray-600">
              <i className="ri-error-warning-line text-2xl text-yellow-500 mb-2"></i>
              <p>Unable to load statistics</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
              {[
                { label: 'Responders', value: `${stats.responders}+` },
                { label: 'Evacuation Centers', value: stats.evacuationCenters.toString() },
                { label: 'Residents Covered', value: `${stats.residentsCovered}+` },
                { label: 'Total Incidents', value: stats.totalIncidents.toString() }
              ].map((s, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-5 md:p-6">
                  <div className="text-2xl md:text-3xl font-bold text-blue-700 mb-1">{s.value}</div>
                  <div className="text-gray-600 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-14 md:py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-8 md:mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Community Voices</h3>
            <p className="text-gray-600 mt-1 md:mt-2">Real feedback from residents and responders</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { quote: 'Clear routes and timely alerts kept my family safe.', name: 'Maria, Resident' },
              { quote: 'Streamlined coordination during operations.', name: 'PO2 Santos, Police' },
              { quote: 'Protocols are easy to follow and accessible.', name: 'Nurse Reyes, MHO' }
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm">
                <i className="ri-double-quotes-l text-xl md:text-2xl text-blue-600"></i>
                <p className="text-gray-700 mt-2 md:mt-3 mb-3 md:mb-4">{t.quote}</p>
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


{/* Partners */}
<section className="bg-white py-10 md:py-12">
  <div className="container mx-auto px-4 max-w-6xl">
    <div className="text-center text-gray-600 mb-4 md:mb-6 font-semibold">
      In partnership with
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 items-center opacity-90">
      {[
        { name: 'LGU', image: '/images/partners/lgu-pt.png', alt: 'Local Government Unit' },
        { name: 'MDRRMO', image: '/images/partners/MDRRMO.png', alt: 'MDRRMO  ' },
        { name: 'BFP', image: '/images/partners/bfp.svg', alt: 'Bureau of Fire Protection' },
        { name: 'PNP', image: '/images/partners/pnp.svg', alt: 'Philippine National Police' },
        { name: 'RedCross', image: '/images/partners/redcross.svg', alt: 'Philippine Red Cross' },
        { name: 'DILG', image: '/images/partners/dilg.svg', alt: 'Department of Interior and Local Government' }
      ].map((partner, i) => (
        <div
          key={i}
          className="h-36 w-36 md:h-40 md:w-40 bg-gray-100 rounded-full flex items-center justify-center mx-auto overflow-hidden border-2 border-gray-200 shadow-md"
        >
          <img
            src={partner.image}
            alt={partner.alt}
            className="h-full w-full object-contain"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = 'none';
              const textFallback = img.nextElementSibling as HTMLElement;
              if (textFallback) {
                textFallback.style.display = 'flex';
              }
            }}
          />
          <div className="hidden items-center justify-center text-gray-500 text-sm md:text-base font-semibold text-center">
            {partner.name}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>


      {/* FAQ */}
      <section className="bg-gradient-to-b from-white to-blue-50 py-14 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 md:mb-10">Frequently Asked Questions</h3>
          <div className="space-y-3 md:space-y-4">
            {[
              { q: 'How do I report an emergency?', a: 'Click Report Incident, describe the situation, and submit your location.' },
              { q: 'Where can I find evacuation centers?', a: 'Go to Evacuation Centers to see locations, capacity, and contact info.' },
              { q: 'Do I need an account?', a: 'Browsing is open; creating an account enables alerts and faster reporting.' }
            ].map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg bg-white">
                <button
                  className="w-full flex items-center justify-between p-3 md:p-4 text-left"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                >
                  <span className="font-semibold text-gray-900">{item.q}</span>
                  <i className={`ri-arrow-down-s-line transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}></i>
                </button>
                {openFaq === idx && (
                  <div className="px-3 md:px-4 pb-3 md:pb-4 text-gray-600 text-sm">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-blue-700 text-white py-14 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">Stay Informed</h3>
          <p className="text-blue-100 mb-5 md:mb-6">Get safety tips and important updates from MDRRMO Rosario.</p>
          <form
            className="flex flex-col sm:flex-row gap-3 justify-center"
            onSubmit={(e) => { e.preventDefault(); }}
          >
            <input
              type="email"
              required
              placeholder="Your email address"
              className="w-full sm:w-auto flex-1 px-4 py-3 rounded-lg text-gray-900"
            />
            <button type="submit" className="px-5 md:px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-semibold rounded-lg">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Hotline Modal */}
      {showHotlineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <i className="ri-phone-line text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Emergency Hotlines</h3>
                    <p className="text-red-100 text-xs">MDRRMO Rosario, Batangas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHotlineModal(false)}
                  className="text-white hover:text-red-100 transition-colors p-2 hover:bg-white/20 rounded-lg"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {/* Priority Section - High Priority */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                  <i className="ri-error-warning-line text-red-600 mr-2"></i>
                  High Priority Contacts
                </h4>
                <div className="space-y-3">
                  {hotlines.filter(h => h.priority === 'high').map((hotline, index) => (
                    <div
                      key={index}
                      className="border border-red-200 bg-red-50 rounded-lg p-3 transition-all hover:shadow-md hover:border-red-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <i className={`${hotline.icon} text-lg text-red-600`}></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-semibold text-gray-900 text-sm mb-1 truncate">{hotline.name}</h5>
                            <p className="text-xs text-gray-600 mb-2">{hotline.description}</p>
                            <p className="text-base font-bold text-red-600">{hotline.number}</p>
                          </div>
                        </div>
                        <a
                          href={`tel:${hotline.number.replace(/\s/g, '')}`}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold transition-all text-xs flex items-center ml-2 flex-shrink-0"
                        >
                          <i className="ri-phone-line mr-1"></i>
                          Call
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Section - Medium Priority */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                  <i className="ri-information-line text-blue-600 mr-2"></i>
                  Support Contacts
                </h4>
                <div className="space-y-3">
                  {hotlines.filter(h => h.priority === 'medium').map((hotline, index) => (
                    <div
                      key={index}
                      className="border border-blue-200 bg-blue-50 rounded-lg p-3 transition-all hover:shadow-md hover:border-blue-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <i className={`${hotline.icon} text-lg text-blue-600`}></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-semibold text-gray-900 text-sm mb-1 truncate">{hotline.name}</h5>
                            <p className="text-xs text-gray-600 mb-2">{hotline.description}</p>
                            <p className="text-base font-bold text-blue-600">{hotline.number}</p>
                          </div>
                        </div>
                        <a
                          href={`tel:${hotline.number.replace(/\s/g, '')}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold transition-all text-xs flex items-center ml-2 flex-shrink-0"
                        >
                          <i className="ri-phone-line mr-1"></i>
                          Call
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Guidelines */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <i className="ri-information-line text-yellow-600 text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-800 text-sm mb-2">Emergency Guidelines</h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li className="flex items-start">
                        <i className="ri-check-line text-yellow-600 mr-2 mt-0.5 flex-shrink-0"></i>
                        Stay calm and provide clear information
                      </li>
                      <li className="flex items-start">
                        <i className="ri-check-line text-yellow-600 mr-2 mt-0.5 flex-shrink-0"></i>
                        Give your exact location and landmarks
                      </li>
                      <li className="flex items-start">
                        <i className="ri-check-line text-yellow-600 mr-2 mt-0.5 flex-shrink-0"></i>
                        Follow emergency responder instructions
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 rounded-b-xl border-t border-gray-200 sticky bottom-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-600">
                  <i className="ri-time-line mr-2 text-blue-500 text-sm"></i>
                  <span className="text-xs font-medium">24/7 Available</span>
                </div>
                <button
                  onClick={() => setShowHotlineModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-semibold text-sm shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="border-t border-gray-200 pt-8">
            <p>&copy; 2024 MDRRMO Rosario, Batangas. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
