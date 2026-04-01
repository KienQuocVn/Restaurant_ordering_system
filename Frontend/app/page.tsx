'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      
      if (parsedUser.role === 'staff') {
        router.push('/staff')
      } else if (parsedUser.role === 'owner') {
        router.push('/owner')
      }
    } else {
      setLoading(false)
    }
  }, [mounted, router])

  if (loading && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2ad38b] to-[#0cceb0] flex items-center justify-center">
        <div className="text-white text-lg">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2ad38b] to-[#0cceb0] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-5xl font-bold text-white mb-2">
            Order Management System
          </h1>
          <p className="text-xl text-white/90">
            Scan QR codes to order food easily and efficiently
          </p>
        </div>

        <div className="space-y-3 mt-8">
          <Button
            onClick={() => router.push('/customer')}
            className="w-full max-w-xs h-12 bg-white text-[#2ad38b] hover:bg-gray-100 font-semibold text-lg"
          >
            Order With QR
          </Button>
          <Button
            onClick={() => router.push('/login')}
            variant="outline"
            className="w-full max-w-xs h-12 border-white text-white hover:bg-white/10 font-semibold text-lg"
          >
            Staff / Admin Sign In
          </Button>
          <Button
            onClick={() => router.push('/signup')}
            variant="outline"
            className="w-full max-w-xs h-12 border-white text-white hover:bg-white/10 font-semibold text-lg"
          >
            Create Staff / Admin Account
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-3xl">
          <div className="bg-white/10 backdrop-blur p-6 rounded-lg text-white">
            <h3 className="font-bold text-lg mb-2">For Customers</h3>
            <p className="text-sm text-white/90">
              Scan QR code and order food from your table
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur p-6 rounded-lg text-white">
            <h3 className="font-bold text-lg mb-2">For Staff</h3>
            <p className="text-sm text-white/90">
              Manage orders and process payments
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur p-6 rounded-lg text-white">
            <h3 className="font-bold text-lg mb-2">For Owners</h3>
            <p className="text-sm text-white/90">
              Monitor restaurant and manage menu
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
