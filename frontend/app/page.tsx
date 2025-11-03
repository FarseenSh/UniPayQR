'use client';

import { useRouter } from 'next/navigation';
import { Scan, Zap, Shield, Users, Bitcoin, Sparkles, TrendingUp, Lock, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full filter blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Simple Navbar */}
      <nav className="relative z-10 glass border-b border-gray-200/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-glow">
              <Bitcoin className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                UniPayQR
              </h1>
              <p className="text-xs text-gray-500">Powered by mUSD</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-700">Live on Mezo Testnet</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-full mb-6 animate-float">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">AI-Powered Payment Matching</span>
          </div>
          
          <h2 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Bitcoin-Backed
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              UPI Payments
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Pay any Indian merchant using <span className="font-bold text-blue-600">mUSD</span>. 
            Our AI instantly matches you with local solvers. Simple. Fast. Secure.
          </p>

          <div className="flex gap-4 justify-center flex-wrap mb-12">
            <button
              onClick={() => router.push('/dashboard')}
              className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 transform hover:scale-105 transition-all shadow-xl hover:shadow-2xl"
            >
              <Scan className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              Start Paying Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => router.push('/solver/onboarding')}
              className="group glass hover:bg-white border-2 border-gray-200 hover:border-purple-300 text-gray-700 px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 transform hover:scale-105 transition-all shadow-lg"
            >
              <TrendingUp className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              Become a Solver
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { label: 'Transaction Fee', value: '0.5%+', color: 'from-blue-500 to-cyan-500' },
              { label: 'Match Time', value: '<30s', color: 'from-purple-500 to-pink-500' },
              { label: 'Solver Tiers', value: '5', color: 'from-orange-500 to-red-500' },
              { label: 'Platform Fee', value: '0.1%', color: 'from-green-500 to-emerald-500' },
            ].map((stat, i) => (
              <div key={i} className="glass rounded-xl p-4 card-hover">
                <div className={`text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
          {[
            { 
              icon: Scan, 
              title: 'Instant QR Scanning', 
              desc: 'Camera, gallery, or manual entry - your choice',
              gradient: 'from-blue-500 to-cyan-500'
            },
            { 
              icon: Zap, 
              title: 'AI Smart Matching', 
              desc: 'Best solver selected in under 30 seconds',
              gradient: 'from-purple-500 to-pink-500'
            },
            { 
              icon: Users, 
              title: 'Local Network', 
              desc: 'P2P solver network across India',
              gradient: 'from-orange-500 to-red-500'
            },
            { 
              icon: Shield, 
              title: 'Bitcoin Security', 
              desc: 'Cryptographically secured by Bitcoin',
              gradient: 'from-green-500 to-emerald-500'
            }
          ].map((feature, i) => (
            <div 
              key={i} 
              className="glass rounded-2xl p-8 card-hover group cursor-pointer"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-3">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* How it Works */}
        <div className="mt-32 text-center">
          <h3 className="text-4xl font-black text-gray-900 mb-4">How It Works</h3>
          <p className="text-gray-600 mb-16 text-lg">Three simple steps to pay with crypto</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: '1', title: 'Scan QR Code', desc: 'Use your camera to scan merchant UPI QR', icon: Scan },
              { step: '2', title: 'Enter Amount', desc: 'Specify amount in INR (₹100-₹100K)', icon: Bitcoin },
              { step: '3', title: 'AI Matches', desc: 'Best solver fulfills payment instantly', icon: Zap },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="glass rounded-2xl p-8 card-hover">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-2xl mb-5 mx-auto shadow-xl">
                    {item.step}
                  </div>
                  <item.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h4 className="font-bold text-gray-900 text-xl mb-3">{item.title}</h4>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                    <ArrowRight className="w-8 h-8 text-purple-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 glass rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
          <div className="relative z-10">
            <Lock className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h3 className="text-3xl font-black text-gray-900 mb-4">Ready to revolutionize payments?</h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-lg">
              Join thousands using mUSD to pay merchants across India. Secure, fast, and powered by Bitcoin.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-5 rounded-2xl font-bold text-lg inline-flex items-center gap-3 transform hover:scale-105 transition-all shadow-xl"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
          <p>© 2025 UniPayQR. Powered by mUSD on Mezo Testnet. Built for the future of payments.</p>
        </div>
      </footer>
    </div>
  );
}

