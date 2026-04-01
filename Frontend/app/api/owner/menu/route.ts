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

    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order')

    if (catError) throw catError

    const { data: items, error: itemError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order')

    if (itemError) throw itemError

    return NextResponse.json({ categories, items })
  } catch (error) {
    console.error('Menu fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { restaurantId, type, data } = await request.json()

    if (type === 'category') {
      const { error } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name: data.name,
        display_order: data.displayOrder || 0,
      })

      if (error) throw error

      return NextResponse.json({ success: true }, { status: 201 })
    } else if (type === 'item') {
      const { error } = await supabase.from('menu_items').insert({
        restaurant_id: restaurantId,
        category_id: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        is_available: true,
        display_order: data.displayOrder || 0,
      })

      if (error) throw error

      return NextResponse.json({ success: true }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Menu creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { itemId, type, data } = await request.json()

    if (type === 'item') {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: data.name,
          description: data.description,
          price: data.price,
          is_available: data.isAvailable,
        })
        .eq('id', itemId)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Menu update error:', error)
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Menu deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}
