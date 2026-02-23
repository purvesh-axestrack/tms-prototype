# TMS Prototype - Transportation Management System

A working prototype demonstrating a Transportation Management System for small to mid-sized trucking carriers with a clean, professional dispatch board interface.

## Features

- **Dispatch Board**: Kanban-style board showing loads organized by status (Created → Assigned → Dispatched → Picked Up → In Transit → Delivered)
- **Driver Assignment**: Assign drivers to loads with automatic conflict detection to prevent double-booking
- **Status Management**: Valid status transitions enforced by state machine
- **Multi-Stop Support**: Handle complex routes with pickup and delivery stops
- **Real-time Stats**: Dashboard showing active loads, available drivers, and today's deliveries

## Tech Stack

### Backend
- Node.js + Express
- In-memory data store (no database required)
- RESTful API
- State machine for load status transitions
- Conflict detection engine

### Frontend
- React 18 + JSX
- Vite (fast build tool)
- TanStack Query (React Query) for data fetching
- Tailwind CSS for styling
- Clean industrial dashboard aesthetic with slate/navy colors and amber accents

## Design

The UI follows a **clean industrial dashboard** design:
- Deep slate/navy color palette with amber action buttons
- Roboto Slab headings + DM Sans body text
- Subtle shadows and card-based layouts
- Distinctive status badges with color coding

## Prerequisites

- Node.js 18+ and npm

## Quick Start

### 1. Start Backend Server

```bash
cd server
npm install
npm start
```

Server runs on **http://localhost:3001**

The server will load sample data:
- 8 loads in various statuses
- 5 drivers with different pay models
- 4 customers

### 2. Start Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

### 3. Open in Browser

Navigate to **http://localhost:5173** and you'll see the dispatch board!

## Project Structure

```
tms-prototype/
├── server/
│   ├── index.js                # Express server
│   ├── data.js                 # Sample data (loads, drivers, customers)
│   ├── stateMachine.js         # Status transition rules
│   ├── conflictDetection.js    # Driver conflict checker
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DispatchBoard.jsx       # Main Kanban board
│   │   │   ├── LoadCard.jsx            # Individual load card
│   │   │   ├── LoadDetail.jsx          # Load details modal
│   │   │   ├── DriverAssignModal.jsx   # Driver assignment with conflict detection
│   │   │   └── StatsBar.jsx            # Dashboard statistics
│   │   ├── services/
│   │   │   └── api.js                  # API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## Demo Workflows

The prototype supports these key workflows:

### 1. View the Dispatch Board

- Loads are organized in columns by status
- Each card shows load details, customer, route, and assigned driver
- Click any load card to see full details

### 2. Assign a Driver to a Load

1. Click on a load card in the "Created" column
2. Click the "Assign" button
3. Select a driver from the dropdown
4. System automatically checks for scheduling conflicts
5. If available, assign the driver
6. Load automatically moves to "Assigned" status

### 3. Progress a Load Through Statuses

1. Click on a load to open details
2. Use the status transition buttons (→ DISPATCHED, → PICKED_UP, etc.)
3. System enforces valid transitions via state machine
4. Watch the load move across the board columns

### 4. View Driver Conflicts

1. Try to assign the same driver to overlapping loads
2. System will show conflict details with existing load information
3. Assignment is blocked until conflicts are resolved

### 5. Monitor Dashboard Stats

- Top bar shows real-time statistics
- Active loads, available drivers, today's deliveries
- Auto-refreshes every 5 seconds

## API Endpoints

The backend provides a RESTful API:

### Loads
- `GET /api/loads` - List all loads (optional filters: status, driver_id, customer_id)
- `GET /api/loads/:id` - Get load details with stops
- `POST /api/loads` - Create new load
- `PATCH /api/loads/:id` - Update load fields
- `PATCH /api/loads/:id/assign` - Assign driver (with conflict checking)
- `PATCH /api/loads/:id/status` - Update status (state machine validation)

### Drivers
- `GET /api/drivers` - List all drivers with stats
- `GET /api/drivers/:id` - Get driver details
- `GET /api/drivers/:id/availability` - Check availability for date range

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer details

### Stats
- `GET /api/stats` - Dashboard statistics

## Sample Data

The prototype includes realistic sample data:

### Drivers (5)
- **John Miller** - CPM ($0.55/mile), Available
- **Maria Garcia** - Percentage (25%), En Route (Load #1001)
- **David Chen** - Flat Rate ($1200), Available
- **Angela Brown** - CPM ($0.60/mile), Available
- **Robert Wilson** - Percentage (28%), Out of Service

### Customers (4)
- Walmart Transportation
- Target Logistics
- CH Robinson
- Amazon Freight

### Loads (8)
Loads span multiple statuses:
- **2 Created** - Ready to assign drivers
- **1 Assigned** - Driver assigned, not dispatched
- **1 Dispatched** - Driver on way to pickup
- **1 Picked Up** - Freight loaded, in transit
- **1 In Transit** - En route to delivery
- **2 Delivered** - Completed loads

## Technical Features

### State Machine
Load status transitions are strictly enforced:
```
CREATED → ASSIGNED → DISPATCHED → PICKED_UP → IN_TRANSIT → DELIVERED
         ↓           ↓            ↓
       CANCELLED  CANCELLED  CANCELLED
```

### Conflict Detection
When assigning drivers, the system:
1. Checks for overlapping date ranges
2. Only considers active loads (not delivered/cancelled)
3. Shows detailed conflict information if found
4. Blocks assignment until conflicts are resolved

### Pay Models (Future Implementation)
The data structure supports three driver pay models:
- **CPM (Cents Per Mile)**: Driver earns per mile driven
- **Percentage**: Driver earns percentage of load revenue
- **Flat Rate**: Fixed payment per load

## Testing

### Manual Testing

1. Log in as dispatcher
2. Create a new load
3. Assign it to a driver
4. Progress through statuses until DELIVERED
5. Log in as accountant
6. Generate settlements for the period
7. Review settlement details
8. Approve the settlement

### API Testing

Use the included `test-api.http` file with VS Code REST Client extension, or use curl:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tms.com","password":"admin123"}'

# Create Load
curl -X POST http://localhost:3000/api/ops/loads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"...", "rate_amount":2500, ...}'
```

## Production Considerations

This is a prototype for demonstration. For production deployment, add:

- Environment variable management (.env files)
- HTTPS/SSL certificates
- Rate limiting and request validation
- S3 integration for document uploads
- Email service for invoice delivery
- Comprehensive error handling
- Unit and integration tests
- Logging and monitoring
- Database backups
- API documentation (Swagger)

## License

MIT License - This is a demonstration prototype.

## Support

For questions or issues, refer to the TMS Technical Specification document.

## Testing

### Manual Testing Steps

1. **Test Driver Assignment**
   - Click on Load #1004 (Created, no driver)
   - Click "Assign" button
   - Select "John Miller"
   - System checks availability ✓
   - Click "Assign Driver"
   - Load moves to "Assigned" column

2. **Test Conflict Detection**
   - Click on Load #1005 (Created, no driver)
   - Try to assign "Maria Garcia" (already on Load #1001)
   - System shows conflict warning ⚠️
   - Assignment is blocked

3. **Test Status Progression**
   - Click Load #1002 (Dispatched)
   - Click "→ PICKED_UP" button
   - Load moves to "Picked Up" column
   - Click "→ IN_TRANSIT"
   - Load moves to "In Transit" column

4. **Test Invalid Transitions**
   - System prevents invalid status changes
   - Example: Cannot go from CREATED directly to DELIVERED

## Troubleshooting

### Port Already in Use

If port 3001 is taken:
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
```

Or change the port in `server/index.js`:
```javascript
const PORT = 3001; // Change to another port
```

### CORS Issues

If you see CORS errors, make sure:
1. Backend is running on port 3001
2. Frontend is running on port 5173
3. Both are running (check terminals)

### Data Not Showing

If the board is empty:
1. Check browser console for errors (F12)
2. Verify backend is running: `curl http://localhost:3001/api/loads`
3. Check that frontend API URL is correct in `frontend/src/services/api.js`

### Tailwind Styles Not Working

If styles look broken:
```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer
```

## Architecture Decisions

### Why In-Memory Data Store?
- **Fast prototype iteration**: No database setup required
- **Easy to demo**: Just `npm start` and go
- **Clear data structure**: Easy to see all sample data in `data.js`
- **Stateless**: Can restart server to reset data

### Why Express over NestJS?
- **Simplicity**: Fewer abstractions for a prototype
- **Faster setup**: No decorators, modules, or DI containers
- **Easier to understand**: Plain JavaScript functions
- **Still professional**: RESTful API with proper structure

### Why React Query?
- **Automatic caching**: Reduces API calls
- **Optimistic updates**: Instant UI feedback
- **Automatic refetching**: Data stays fresh
- **Built-in loading/error states**: Cleaner component code

## Future Enhancements

To turn this prototype into a production system:

1. **Persistence Layer**
   - Replace in-memory store with PostgreSQL
   - Add migrations and seed scripts
   - Implement proper database indexes

2. **Authentication**
   - Add JWT token-based auth
   - Role-based access control (RBAC)
   - Password hashing with Argon2

3. **Settlement Engine**
   - Implement pay calculator service
   - Batch settlement generation
   - PDF pay stub generation

4. **Document Management**
   - S3 integration for BOL/POD uploads
   - Document verification workflow
   - Presigned URL generation

5. **Additional Features**
   - Load creation form
   - Driver management pages
   - Customer invoicing
   - Reporting and analytics

## Credits

Built based on the TMS Technical Specification document, implementing:
- ✅ Core domain model (loads, drivers, customers)
- ✅ State machine for status transitions
- ✅ Conflict detection engine
- ✅ Multi-stop route support
- ✅ Clean industrial dashboard UI

## License

This is a demonstration prototype. Use as you see fit.
