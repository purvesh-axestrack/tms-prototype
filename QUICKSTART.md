# TMS Prototype - Quick Start Guide

Get the TMS prototype running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Two terminal windows

## Step-by-Step Instructions

### Terminal 1: Start Backend

```bash
# Navigate to server folder
cd tms-prototype/server

# Install dependencies (first time only)
npm install

# Start server
npm start
```

You should see:
```
🚚 TMS Server running on http://localhost:3001
📊 API Base URL: http://localhost:3001/api

📦 Sample Data Loaded:
   - 8 loads
   - 5 drivers
   - 4 customers

✅ Ready to accept requests!
```

**Keep this terminal running!**

---

### Terminal 2: Start Frontend

```bash
# Navigate to frontend folder
cd tms-prototype/frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

**Keep this terminal running too!**

---

### Open in Browser

Navigate to: **http://localhost:5173**

You should see the TMS Dispatch Board! 🎉

## What You'll See

### Dashboard Stats Bar
- **Active Loads**: 4 loads currently in progress
- **Available Drivers**: 3 drivers ready for assignment
- **Today's Deliveries**: 0 (sample data is from past dates)
- **Total Loads**: 8 loads total

### Dispatch Board Columns
- **Created** (2 loads) - Ready to assign
- **Assigned** (1 load) - Driver assigned
- **Dispatched** (1 load) - Driver en route
- **Picked Up** (1 load) - Freight loaded
- **In Transit** (1 load) - Delivery in progress
- **Delivered** (2 loads) - Completed

## Try These Actions

### 1. View Load Details
- Click on any load card
- See full route details, stops, driver info
- Close with X button

### 2. Assign a Driver
- Click Load #1004 or #1005 (in Created column)
- Click "Assign" button
- Select "John Miller" from dropdown
- System checks availability ✓
- Click "Assign Driver"
- Watch load move to "Assigned" column!

### 3. Test Conflict Detection
- Click Load #1005
- Try to assign "Maria Garcia"
- See conflict warning (she's on Load #1001)
- Assignment blocked until conflict resolved

### 4. Progress Load Status
- Click Load #1002 (Dispatched)
- Click "→ PICKED_UP"
- See load move to next column
- Continue: "→ IN_TRANSIT" → "→ DELIVERED"

### 5. Watch Real-Time Updates
- Open two browser windows side-by-side
- Make changes in one window
- Watch updates appear in the other (3-5 second delay)

## Common Issues

### "Cannot GET /"
- Make sure you're at http://localhost:**5173** (not 3001)

### "Network Error" or Empty Board
- Check Terminal 1 - is the backend running?
- Try: `curl http://localhost:3001/api/loads`

### Styles Look Broken
- Wait for Vite to finish building
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Port Already in Use
- Backend (3001): Kill with `lsof -ti:3001 | xargs kill -9`
- Frontend (5173): Kill with `lsof -ti:5173 | xargs kill -9`

## Resetting Data

To reset all loads back to original state:
1. Stop the backend (Ctrl+C in Terminal 1)
2. Restart with `npm start`
3. All changes are lost (in-memory store)

## Next Steps

After exploring the prototype:

1. Read the main **README.md** for full documentation
2. Examine the code structure:
   - `server/data.js` - Sample data
   - `server/stateMachine.js` - Status transition rules
   - `frontend/src/components/` - React UI components
3. Review the **TMS Technical Specification** document
4. Consider production enhancements (database, auth, etc.)

## Need Help?

- Check the **Troubleshooting** section in README.md
- Verify both terminals are still running
- Check browser console for errors (F12)

---

Happy dispatching! 🚚📦
