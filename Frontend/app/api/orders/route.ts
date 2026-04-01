import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      restaurantId,
      tableId,
      items,
      totalAmount,
      notes,
    } = await request.json()

    if (!restaurantId || !tableId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: userId || null,
        restaurant_id: restaurantId,
        table_id: tableId,
        status: 'pending',
        total_amount: totalAmount,
        notes,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      special_instructions: item.specialInstructions,
      unit_price: item.price,
    }))

    const { error: itemError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemError) throw itemError

    return NextResponse.json(
      { success: true, order },
      { status: 201 }
    )
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const restaurantId = searchParams.get('restaurant_id')

    if (!userId || !restaurantId) {
      return NextResponse.json(
        { error: 'User ID and Restaurant ID required' },
        { status: 400 }
      )
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          price_at_order,
          menu_items:menu_item_id (name, description)
        )
      `)
      .eq('customer_id', userId)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Order fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
