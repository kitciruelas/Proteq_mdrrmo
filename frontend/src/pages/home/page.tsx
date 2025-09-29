"use client"

import { Link, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import Navbar from "../../components/Navbar"
import { getAuthState, type UserData } from "../../utils/auth"
import { publicApi } from "../../utils/api"

export default function Home() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [showHotlineModal, setShowHotlineModal] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [stats, setStats] = useState({
    responders: 0,
    evacuationCenters: 0,
    residentsCovered: 0,
    totalIncidents: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [testimonials, setTestimonials] = useState<
    Array<{
      id: number
      quote: string
      rating: number
      name: string
      type: string
      department?: string
      created_at: string
    }>
  >([])
  const [loadingTestimonials, setLoadingTestimonials] = useState(true)
  const [testimonialsError, setTestimonialsError] = useState<string | null>(null)
  const [testimonialsLimit, setTestimonialsLimit] = useState(3)
  const [showAllTestimonials, setShowAllTestimonials] = useState(false)

  useEffect(() => {
    // Check authentication state using the new utility
    const authState = getAuthState()
    setIsLoggedIn(authState.isAuthenticated)
    setUserData(authState.userData)

    // Redirect staff users to their dashboard
    if (authState.isAuthenticated && authState.userType === "staff") {
      navigate("/staff")
      return
    }

    // Listen for storage changes to update authentication state
    const handleStorageChange = () => {
      const newAuthState = getAuthState()
      setIsLoggedIn(newAuthState.isAuthenticated)
      setUserData(newAuthState.userData)

      // Redirect staff users to their dashboard
      if (newAuthState.isAuthenticated && newAuthState.userType === "staff") {
        navigate("/staff")
        return
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Also listen for custom events (for same-tab updates)
    window.addEventListener("authStateChanged", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("authStateChanged", handleStorageChange)
    }
  }, [navigate])

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true)
      setStatsError(null)
      try {
        const response = await publicApi.getHomeStats()
        if (response.success) {
          const apiStats = response.stats as any // Type assertion for API response
          setStats({
            responders: apiStats.staff?.total || 0,
            evacuationCenters: apiStats.evacuation_centers?.total || 0,
            residentsCovered: apiStats.users?.total || 0, // Map users.total to residentsCovered
            totalIncidents: apiStats.incidents?.total || 0,
          })
        } else {
          setStatsError("Failed to load stats")
        }
      } catch (error) {
        setStatsError("Failed to load stats")
      } finally {
        setLoadingStats(false)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoadingTestimonials(true)
      setTestimonialsError(null)
      try {
        const response = await publicApi.getTestimonials(testimonialsLimit)
        if (response.success) {
          setTestimonials(response.testimonials)
        } else {
          setTestimonialsError("Failed to load testimonials")
        }
      } catch (error) {
        setTestimonialsError("Failed to load testimonials")
      } finally {
        setLoadingTestimonials(false)
      }
    }

    fetchTestimonials()
  }, [testimonialsLimit])

  // Hotline data for MDRRMO Padre Garcia, Batangas
  const hotlines = [
    {
      name: "MDRRMO",
      description: "Municipal Disaster Risk Reduction & Management Office",
      number: "(043) 311.2935 | 703.2646 | 0917.133.9605",
      icon: "ri-shield-cross-line",
      logo: "/images/partners/MDRRMO.png",
      priority: "high",
    },
    {
      name: "PNP",
      description: "Municipal Police Station",
      number: "(043) 724.7026 | 0915.254.2577",
      icon: "ri-police-car-line",
      logo: "/images/partners/pnp.jpg",
      priority: "high",
    },
    {
      name: "BFP",
      description: "Municipal Fire Station",
      number: "(043) 312.1102 | 0915.602.4435",
      icon: "ri-fire-line",
      logo: "/images/partners/bfp.jpg",
      priority: "high",
    },
    {
      name: "RHU I",
      description: "Municipal Health Office",
      number: "(043) 740.1338 | 0908.280.1497",
      icon: "ri-hospital-line",
      logo: "/images/partners/mho.png",
      priority: "medium",
    },
    {
      name: "MSWDO",
      description: "Municipal Social Welfare & Development Office",
      number: "(043) 312.1367",
      icon: "ri-community-line",
      logo: "/images/partners/msdw.jpg",
      priority: "medium",
    },
    {
      name: "MVM Hospital",
      description: "Rosario District Hospital",
      number: "(043) 312.0411",
      icon: "ri-hospital-fill",
      logo: "/images/partners/mvm.jpg",
      priority: "medium",
    },
    {
      name: "BATELEC II - AREA II",
      description: "Batangas II Electric Cooperative Inc.",
      number: "0917.550.0754 | 0998.548.6153",
      icon: "ri-flashlight-line",
      logo: "/images/partners/batelec.jpg",
      priority: "medium",
    },
    {
      name: "PRC",
      description: "Philippine Red Cross Batangas Chapter - Lipa City Branch",
      number: "(043) 740.0768 | 0917.142.9378",
      icon: "ri-first-aid-kit-line",
      logo: "/images/partners/prc.png",
      priority: "medium",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Navbar isAuthenticated={isLoggedIn} userData={userData} />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Hero Background with Image */}
        <div className="relative h-[500px] md:h-[700px] lg:h-[800px] bg-gradient-to-r from-blue-900/90 to-blue-800/80">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/rosario-hero.png')",
            }}
          ></div>
          {/* Enhanced Overlay with subtle pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-800/85"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-5xl">
              {isLoggedIn ? (
                // Authenticated user hero
                <div className="text-left">
                  {/* Logo/Icon */}
                  <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-white/95 backdrop-blur-sm rounded-2xl mb-6 md:mb-8 shadow-2xl border border-white/20">
                    <i className="ri-shield-check-line text-2xl md:text-3xl lg:text-4xl text-blue-600"></i>
                  </div>

                  {/* Main Title */}
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight text-balance">
                    Welcome back to
                    <span className="block text-yellow-300 bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                      ProteQ Emergency Hub
                    </span>
                  </h1>

                  {/* Description */}
                  <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-3xl mb-8 md:mb-10 leading-relaxed text-pretty">
                    Your comprehensive emergency management dashboard is ready. Access real-time incident tracking,
                    evacuation routing, and safety protocols.
                  </p>
                </div>
              ) : (
                // Non-authenticated user hero
                <div className="text-left">
                  {/* MDRRMO Title */}
                  <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white mb-3 md:mb-4 leading-tight text-balance">
                    Municipal Disaster Risk Reduction
                    <span className="block text-yellow-300 bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                      & Management Office
                    </span>
                  </h1>

                  {/* Location */}
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-semibold text-blue-200 mb-6 md:mb-8">
                    Rosario, Batangas
                  </h2>

                  {/* Description */}
                  <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-4xl mb-8 md:mb-12 leading-relaxed text-pretty">
                    Committed to protecting and serving our community through comprehensive disaster preparedness, rapid
                    emergency response, and proactive public safety management.
                  </p>

                  {/* Call to Action */}
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                    <a
                      href="#services"
                      className="bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-blue-900 px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 shadow-2xl hover:shadow-yellow-500/25 hover:-translate-y-1 text-center"
                    >
                      Emergency Services
                    </a>
                    <button
                      onClick={() => setShowHotlineModal(true)}
                      className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 shadow-2xl hover:shadow-red-500/25 hover:-translate-y-1 text-center"
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
      <div id="services" className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6 text-balance">
              {isLoggedIn ? `Welcome back, ${userData?.firstName || "User"}!` : "Emergency Services"}
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 md:mb-16 max-w-4xl mx-auto text-pretty">
              {isLoggedIn
                ? "Access your emergency management tools"
                : `Comprehensive disaster risk reduction and emergency response services for Rosario, Batangas`}
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            {isLoggedIn ? (
              // Authenticated user content
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 mb-16 md:mb-20">
                {userData?.userType === "staff" && (
                  <Link
                    to="/staff"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:border-purple-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-dashboard-3-line text-3xl md:text-4xl text-purple-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Staff Dashboard</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed">
                      Access your staff dashboard with emergency management tools
                    </p>
                    <div className="flex items-center text-purple-600 group-hover:text-purple-700">
                      <span className="font-semibold text-lg">Go to Dashboard</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>
                )}

                <Link
                  to="/incident-report"
                  className="bg-white border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:border-red-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                    <i className="ri-error-warning-line text-3xl md:text-4xl text-red-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Report Incident</h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed">
                    Submit emergency incidents and safety concerns with real-time tracking
                  </p>
                  <div className="flex items-center text-red-600 group-hover:text-red-700">
                    <span className="font-semibold text-lg">Report Now</span>
                    <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                  </div>
                </Link>

                <Link
                  to="/evacuation-center"
                  className="bg-white border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                    <i className="ri-building-2-line text-3xl md:text-4xl text-blue-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Evacuation Centers</h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed">
                    Find nearby evacuation centers with real-time capacity and status updates
                  </p>
                  <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                    <span className="font-semibold text-lg">View Centers</span>
                    <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                  </div>
                </Link>

                <Link
                  to="/safety-protocols"
                  className="bg-white border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:border-green-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                    <i className="ri-shield-check-line text-3xl md:text-4xl text-green-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Safety Protocols</h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed">
                    Access comprehensive emergency procedures and safety guidelines
                  </p>
                  <div className="flex items-center text-green-600 group-hover:text-green-700">
                    <span className="font-semibold text-lg">View Protocols</span>
                    <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                  </div>
                </Link>
              </div>
            ) : (
              // Non-authenticated user content - MDRRMO Services
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 mb-16 md:mb-20">
                  <Link
                    to="/evacuation-center"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-building-2-line text-3xl md:text-4xl text-blue-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Evacuation Centers</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed">
                      View available evacuation centers in Rosario, Batangas with capacity and contact information
                    </p>
                    <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                      <span className="font-semibold text-lg">View Centers</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>

                  <Link
                    to="/safety-protocols"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:border-green-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-shield-check-line text-3xl md:text-4xl text-green-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Safety Protocols</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed">
                      Access emergency procedures and safety guidelines for various disaster scenarios
                    </p>
                    <div className="flex items-center text-green-600 group-hover:text-green-700">
                      <span className="font-semibold text-lg">View Protocols</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>

                  <Link
                    to="/incident-report"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:border-red-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-error-warning-line text-3xl md:text-4xl text-red-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Report Incident</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed">
                      Report emergencies and safety concerns to MDRRMO Rosario
                    </p>
                    <div className="flex items-center text-red-600 group-hover:text-red-700">
                      <span className="font-semibold text-lg">Report Now</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>
                </div>

                {/* Authentication CTA */}
                <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-10 md:p-12 shadow-xl">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <i className="ri-user-add-line text-3xl text-blue-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">
                    Join Our Emergency Response Network
                  </h3>
                  <p className="text-lg text-gray-600 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                    Sign up to access advanced features, submit reports, and receive real-time emergency alerts for
                    Rosario, Batangas
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
                    <Link
                      to="/auth/signup"
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 md:px-10 rounded-xl transition-all duration-300 font-semibold shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1 text-lg"
                    >
                      Create Account
                    </Link>
                    <Link
                      to="/auth/login"
                      className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 md:px-10 rounded-xl transition-all duration-300 font-semibold hover:-translate-y-1 text-lg"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              {
                icon: "ri-timer-flash-line",
                title: "Rapid Response",
                desc: "Coordinated, time-critical incident handling",
                color: "from-orange-100 to-orange-200",
                iconColor: "text-orange-600",
              },
           {
  icon: "ri-hotel-line", // or "ri-building-2-line" para mukhang shelter
  title: "Evacuation Centers",
  desc: "Nearby designated safe shelters with capacity info",
  color: "from-green-100 to-green-200",
  iconColor: "text-green-600",
},

              {
                icon: "ri-shield-star-line",
                title: "Safety Protocols",
                desc: "Up-to-date, practical safety guidance",
                color: "from-green-100 to-green-200",
                iconColor: "text-green-600",
              },
              {
                icon: "ri-bar-chart-2-line",
                title: "Live Insights",
                desc: "Data-driven decisions and monitoring",
                color: "from-purple-100 to-purple-200",
                iconColor: "text-purple-600",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white/80 backdrop-blur-sm border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"
              >
                <div
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${f.color} ${f.iconColor} flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300`}
                >
                  <i className={`${f.icon} text-2xl md:text-3xl`}></i>
                </div>
                <h4 className="font-bold text-xl md:text-2xl text-gray-900 mb-3 md:mb-4">{f.title}</h4>
                <p className="text-gray-600 text-lg leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          {loadingStats ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 p-10 md:p-12 hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
                      <div className="w-8 h-8 bg-gray-300 rounded"></div>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-blue-700 mb-3 animate-pulse">
                      <div className="h-10 bg-gray-200 rounded w-20 mx-auto"></div>
                    </div>
                    <div className="text-gray-600 animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-24 mx-auto"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : statsError ? (
            <div className="text-center bg-white rounded-3xl shadow-xl border-2 border-gray-100 p-12 md:p-16">
              <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-error-warning-line text-3xl text-red-500"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Statistics</h3>
              <p className="text-gray-600 text-lg">
                We're experiencing technical difficulties. Please try again later.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
              {[
                {
                  label: "Responders",
                  value: `${stats.responders}+`,
                  icon: "ri-user-star-line",
                  color: "from-blue-500 to-blue-600",
                  bgColor: "from-blue-50 to-blue-100",
                },
                {
                  label: "Evacuation Centers",
                  value: stats.evacuationCenters.toString(),
                  icon: "ri-building-2-line",
                  color: "from-green-500 to-green-600",
                  bgColor: "from-green-50 to-green-100",
                },
                {
                  label: "Residents Covered",
                  value: `${stats.residentsCovered}+`,
                  icon: "ri-shield-user-line",
                  color: "from-purple-500 to-purple-600",
                  bgColor: "from-purple-50 to-purple-100",
                },
                {
                  label: "Total Incidents",
                  value: stats.totalIncidents.toString(),
                  icon: "ri-alert-line",
                  color: "from-red-500 to-red-600",
                  bgColor: "from-red-50 to-red-100",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 p-10 md:p-12 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div
                      className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${s.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <i className={`${s.icon} text-2xl md:text-3xl text-gray-700`}></i>
                    </div>
                    <div
                      className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent mb-3`}
                    >
                      {s.value}
                    </div>
                    <div className="text-gray-600 font-medium text-lg">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Additional Info */}
          <div className="text-center mt-16 md:mt-20">
            <p className="text-gray-500">
              Statistics updated in real-time • Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="text-center mb-12 md:mb-16">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Community Voices</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Real feedback from residents and responders</p>
          </div>

          {loadingTestimonials ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-8 md:p-10 shadow-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  </div>
                  <div className="mt-6 h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : testimonialsError ? (
            <div className="text-center bg-white rounded-2xl border-2 border-gray-100 p-12 shadow-lg">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-error-warning-line text-red-500 text-2xl"></i>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Unable to Load Testimonials</h4>
              <p className="text-gray-600">We're experiencing technical difficulties. Please try again later.</p>
            </div>
          ) : testimonials.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl border-2 border-gray-100 p-8 md:p-10 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex items-center mb-4">
                      <i className="ri-double-quotes-l text-2xl md:text-3xl text-blue-600"></i>
                      <div className="ml-auto flex">
                        {[...Array(5)].map((_, i) => (
                          <i
                            key={i}
                            className={`ri-star-${i < t.rating ? "fill" : "line"} text-yellow-400 text-lg`}
                          ></i>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-lg mb-6 leading-relaxed">{t.quote}</p>
                    <div className="text-lg font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{t.type === "Staff" ? t.department : t.type}</div>
                  </div>
                ))}
              </div>
              {testimonials.length > 0 && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => {
                      if (showAllTestimonials) {
                        setTestimonialsLimit(3)
                      } else {
                        setTestimonialsLimit(1000) // large number to show all
                      }
                      setShowAllTestimonials(!showAllTestimonials)
                    }}
                    className="inline-flex items-center text-blue-600 px-8 py-4 font-semibold text-lg hover:bg-blue-50 rounded-xl transition-all duration-300"
                  >
                    {showAllTestimonials ? (
                      <>
                        Back to Less
                        <i className="ri-arrow-up-s-line ml-2"></i>
                      </>
                    ) : (
                      <>
                        See More
                        <i className="ri-arrow-down-s-line ml-2"></i>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center bg-white rounded-2xl border-2 border-gray-100 p-12 shadow-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-chat-voice-line text-blue-500 text-2xl"></i>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">No Testimonials Yet</h4>
              <p className="text-gray-600">
                Testimonials will appear here once community members share their feedback.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Partners */}
      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="text-center text-gray-600 mb-8 md:mb-12 font-semibold text-lg">In partnership with</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-12 items-center opacity-90">
            {[
              { name: "LGU", image: "/images/partners/lgu-pt.png", alt: "Local Government Unit" },
              { name: "MDRRMO", image: "/images/partners/MDRRMO.png", alt: "MDRRMO  " },
              { name: "BFP", image: "/images/partners/bfp.svg", alt: "Bureau of Fire Protection" },
              { name: "PNP", image: "/images/partners/pnp.svg", alt: "Philippine National Police" },
              { name: "RedCross", image: "/images/partners/redcross.svg", alt: "Philippine Red Cross" },
              { name: "DILG", image: "/images/partners/dilg.svg", alt: "Department of Interior and Local Government" },
            ].map((partner, i) => (
              <div
                key={i}
                className="h-32 w-32 md:h-40 md:w-40 lg:h-44 lg:w-44 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto overflow-hidden border-2 border-gray-200 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <img
                  src={partner.image || "/placeholder.svg"}
                  alt={partner.alt}
                  className="h-full w-full object-contain p-4"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    img.style.display = "none"
                    const textFallback = img.nextElementSibling as HTMLElement
                    if (textFallback) {
                      textFallback.style.display = "flex"
                    }
                  }}
                />
                <div className="hidden items-center justify-center text-gray-500 font-semibold text-center">
                  {partner.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-12 md:mb-16">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4 md:space-y-6">
            {[
              {
                q: "How do I report an emergency?",
                a: "Click Report Incident, describe the situation, and submit your location.",
              },
              {
                q: "Where can I find evacuation centers?",
                a: "Go to Evacuation Centers to see locations, capacity, and contact info.",
              },
              {
                q: "Do I need an account?",
                a: "Browsing is open; creating an account enables alerts and faster reporting.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="border-2 border-gray-200 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <button
                  className="w-full flex items-center justify-between p-6 md:p-8 text-left"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                >
                  <span className="font-semibold text-gray-900 text-lg md:text-xl">{item.q}</span>
                  <i
                    className={`ri-arrow-down-s-line transition-transform text-2xl ${openFaq === idx ? "rotate-180" : ""}`}
                  ></i>
                </button>
                {openFaq === idx && (
                  <div className="px-6 md:px-8 pb-6 md:pb-8 text-gray-600 text-lg leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>
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
                    <img
                      src="/images/partners/MDRRMO.png"
                      alt="MDRRMO Logo"
                      className="w-8 h-8 object-contain rounded-full"
                    />
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
                  {hotlines
                    .filter((h) => h.priority === "high")
                    .map((hotline, index) => (
                      <div
                        key={index}
                        className="border border-red-200 bg-red-50 rounded-lg p-3 transition-all hover:shadow-md hover:border-red-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                              <img
                                src={hotline.logo || "/placeholder.svg"}
                                alt={`${hotline.name} Logo`}
                                className="w-8 h-8 object-contain rounded-full"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-semibold text-gray-900 text-sm mb-1 truncate">{hotline.name}</h5>
                              <p className="text-xs text-gray-600 mb-2">{hotline.description}</p>
                              <p className="text-base font-bold text-red-600">{hotline.number}</p>
                            </div>
                          </div>
                          <a
                            href={`tel:${hotline.number.replace(/\s/g, "")}`}
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
                  {hotlines
                    .filter((h) => h.priority === "medium")
                    .map((hotline, index) => (
                      <div
                        key={index}
                        className="border border-blue-200 bg-blue-50 rounded-lg p-3 transition-all hover:shadow-md hover:border-blue-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                              <img
                                src={hotline.logo || "/placeholder.svg"}
                                alt={`${hotline.name} Logo`}
                                className="w-8 h-8 object-contain rounded-full"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-semibold text-gray-900 text-sm mb-1 truncate">{hotline.name}</h5>
                              <p className="text-xs text-gray-600 mb-2">{hotline.description}</p>
                              <p className="text-base font-bold text-blue-600">{hotline.number}</p>
                            </div>
                          </div>
                          <a
                            href={`tel:${hotline.number.replace(/\s/g, "")}`}
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

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        {/* Main Footer Content */}
        <div className="py-16 md:py-20">
          <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {/* Organization Info */}
              <div className="lg:col-span-2">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12  flex items-center justify-center mr-4">
              <img src="/images/partners/MDRRMO.png" alt="Logo" className="w-40 h-50 rounded-lg shadow-md object-contain" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">MDRRMO Rosario</h3>
                    <p className="text-gray-400 text-sm">Batangas Province</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
                  Municipal Disaster Risk Reduction & Management Office committed to protecting and serving our
                  community through comprehensive disaster preparedness and emergency response.
                </p>
                <div className="flex space-x-4">
                  <a
                    href="https://www.facebook.com/RosarioMDRRMO"
                    className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors duration-300"
                  >
                    <i className="ri-facebook-fill text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors duration-300"
                  >
                    <i className="ri-twitter-fill text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors duration-300"
                  >
                    <i className="ri-instagram-line text-lg"></i>
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      to="/evacuation-center"
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      Evacuation Centers
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/safety-protocols"
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      Safety Protocols
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/incident-report"
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      Report Incident
                    </Link>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-300">
                      Weather Updates
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-300">
                      Community Resources
                    </a>
                  </li>
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-lg font-semibold mb-6">Contact Information</h4>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <i className="ri-map-pin-line text-blue-400 mt-1 mr-3"></i>
                    <div>
                      <p className="text-gray-300 text-sm">Municipal Hall, Rosario</p>
                      <p className="text-gray-300 text-sm">Batangas, Philippines</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-phone-line text-blue-400 mr-3"></i>
                    <p className="text-gray-300 text-sm">(043) 311.2935</p>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-mail-line text-blue-400 mr-3"></i>
                    <p className="text-gray-300 text-sm">mdrrmo@rosario.gov.ph</p>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowHotlineModal(true)}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-300 text-sm"
                    >
                      Emergency Hotlines
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-700 py-8">
          <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2024 MDRRMO Rosario, Batangas. All rights reserved.
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Accessibility
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Site Map
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
