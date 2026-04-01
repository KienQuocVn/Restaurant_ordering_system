# QR Order Management System - Setup Guide

A complete restaurant ordering system where customers scan QR codes on tables to place orders, staff manages orders, and owners track analytics.

## Features

### Customer Features
- Scan QR code on table to access menu
- Browse menu by categories
- Add items to cart with quantity
- Add special requests/notes
- Place order and receive confirmation
- Track order status

### Staff Features
- View all pending and in-progress orders
- Update order status (pending → in progress → completed)
- Table status overview map
- Process payments (Cash, Card, Mobile Money, Bank Transfer)
- Real-time order updates

### Owner Features
- Dashboard with KPIs (total orders, revenue, completed orders, avg order value)
- Analytics charts (top-selling items, payment methods)
- Menu management (add, edit, delete items)
- QR code generation and management for tables
- Restaurant settings management

## Technology Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **QR Codes**: qrcode.react

## Setup Instructions

### 1. Database Setup

The database schema is created automatically by running the migration scripts.

**Migration files:**
- `scripts/01-init-schema.sql` - Creates all tables with RLS policies
- `scripts/02-sample-data.sql` - Adds sample data for testing

### 2. Environment Variables

Add the following to your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Installation

```bash
pnpm install
pnpm dev
```

## Database Schema

### Users Table
- `id` - UUID (Primary Key)
- `email` - User email
- `name` - User full name
- `role` - 'customer', 'staff', or 'owner'
- `restaurant_id` - Reference to restaurant (for staff and owner)
- `created_at` - Timestamp

### Restaurants Table
- `id` - UUID (Primary Key)
- `name` - Restaurant name
- `owner_id` - Reference to owner user
- `address` - Restaurant address
- `phone` - Restaurant phone
- `created_at` - Timestamp

### Dining Tables Table
- `id` - UUID (Primary Key)
- `restaurant_id` - Reference to restaurant
- `table_number` - Table identifier
- `capacity` - Seating capacity
- `status` - 'available' or 'occupied'

### Menu Categories Table
- `id` - UUID (Primary Key)
- `restaurant_id` - Reference to restaurant
- `name` - Category name (Pizza, Pasta, Drinks, etc.)
- `description` - Category description
- `display_order` - Sort order

### Menu Items Table
- `id` - UUID (Primary Key)
- `restaurant_id` - Reference to restaurant
- `category_id` - Reference to category
- `name` - Item name
- `description` - Item description
- `price` - Item price
- `is_available` - Availability status
- `display_order` - Sort order

### Orders Table
- `id` - UUID (Primary Key)
- `restaurant_id` - Reference to restaurant
- `table_id` - Reference to dining table
- `user_id` - Customer user ID
- `status` - 'pending', 'in_progress', 'completed', 'cancelled'
- `total_amount` - Order total
- `special_requests` - Customer notes
- `created_at` - Order timestamp

### Order Items Table
- `id` - UUID (Primary Key)
- `order_id` - Reference to order
- `menu_item_id` - Reference to menu item
- `quantity` - Item quantity
- `special_instructions` - Special instructions for item
- `price_at_order` - Price at time of order

### Payments Table
- `id` - UUID (Primary Key)
- `order_id` - Reference to order
- `payment_method` - 'cash', 'card', 'momo', 'bank_transfer'
- `amount` - Payment amount
- `status` - 'pending' or 'completed'
- `paid_at` - Payment timestamp

## Authentication Flow

### Customer Registration/Login
```
/signup → Create account with 'customer' role → /login → /customer dashboard
```

### Staff Registration/Login
```
/signup → Create account with 'staff' role + restaurant ID → /login → /staff dashboard
```

### Owner Registration/Login
```
/signup → Create account with 'owner' role → /login → /owner dashboard
```

## QR Code Format

QR codes contain the following data:
```
{restaurantId}|table_{tableNumber}
```

Example: `rest-001|table_5`

When scanned, this directs customers to the ordering page for that specific table.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login

### Menu
- `GET /api/menu?restaurant_id={id}` - Get menu categories and items

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders?user_id={id}&restaurant_id={id}` - Get customer orders

### Staff
- `GET /api/staff/orders?restaurant_id={id}` - Get restaurant orders
- `PATCH /api/staff/orders` - Update order status
- `GET /api/staff/tables?restaurant_id={id}` - Get table status

### Payments
- `POST /api/payments` - Process payment
- `GET /api/payments?order_id={id}` - Get payment info

### Owner
- `GET /api/owner/analytics?restaurant_id={id}` - Get analytics data
- `GET /api/owner/menu?restaurant_id={id}` - Get menu items
- `POST /api/owner/menu` - Add menu item or category
- `PATCH /api/owner/menu` - Update menu item
- `DELETE /api/owner/menu?item_id={id}` - Delete menu item

## Page Routes

### Public Pages
- `/` - Home page with login/signup options
- `/login` - Login page
- `/signup` - Signup page

### Customer Routes
- `/customer` - Customer ordering dashboard with QR scanner

### Staff Routes
- `/staff` - Staff order management and table overview

### Owner Routes
- `/owner` - Owner dashboard with analytics
- `/owner/qr-codes` - QR code generation for tables

## Testing the Application

### Test as Customer
1. Sign up with role "customer"
2. Go to `/customer`
3. Scan QR code: `rest-001|table_1`
4. Browse menu and place order

### Test as Staff
1. Sign up with role "staff" and restaurant ID `rest-001`
2. Go to `/staff`
3. View pending orders and update status
4. Process payments

### Test as Owner
1. Sign up with role "owner"
2. Go to `/owner`
3. View dashboard analytics
4. Go to `/owner/qr-codes`
5. Generate QR codes for tables

## Security Features

- Password hashing with bcryptjs
- Row Level Security (RLS) policies on all tables
- Protected API routes with authentication
- Session management with localStorage
- SQL injection prevention with parameterized queries
- Role-based access control

## Development Notes

- The app uses localStorage for session management
- Real-time order updates use 5-second polling
- QR codes are generated client-side
- Analytics data is cached per session
- All prices are stored as decimal values for accuracy

## Future Enhancements

- WebSocket for real-time notifications
- Advanced analytics with date range filtering
- Multiple restaurant management for owners
- Staff scheduling and shift management
- Inventory management
- Push notifications for orders
- Mobile app version
- Multi-language support
- Integration with payment gateways
