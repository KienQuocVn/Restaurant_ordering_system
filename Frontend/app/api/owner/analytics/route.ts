import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID required' },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's orders
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', today.toISOString())

    if (todayError) throw todayError

    // Get all payments for today
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, payment_method')
      .gte('paid_at', today.toISOString())

    if (paymentsError) throw paymentsError

    // Get top items
    const { data: topItems, error: itemsError } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity, menu_items(name, price)')
      .gte('created_at', today.toISOString())

    if (itemsError) throw itemsError

    // Calculate stats
    const totalOrders = todayOrders.length
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const completedOrders = todayOrders.filter(
      (o) => o.status === 'completed'
    ).length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Group items by name
    const itemSales: Record<string, { name: string; quantity: number; price: number }> = {}
    topItems.forEach((item: any) => {
      if (item.menu_items?.name) {
        const key = item.menu_items.name
        if (!itemSales[key]) {
          itemSales[key] = {
            name: key,
            quantity: 0,
            price: item.menu_items.price || 0,
          }
        }
        itemSales[key].quantity += item.quantity || 0
      }
    })

    const topSellingItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Payment method breakdown
    const paymentMethods: Record<string, number> = {}
    payments.forEach((p: any) => {
      const method = p.payment_method || 'unknown'
      paymentMethods[method] = (paymentMethods[method] || 0) + (p.amount || 0)
    })

    return NextResponse.json({
      stats: {
        totalOrders,
        totalRevenue,
        completedOrders,
        averageOrderValue,
      },
      topSellingItems,
      paymentMethods,
      recentOrders: todayOrders.slice(0, 10),
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
