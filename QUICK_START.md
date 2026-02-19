# Quick Start Guide - 5 Minutes to Running App

## Prerequisites
- Node.js installed (check with `node -v`)
- MongoDB installed and running

## Step 1: Setup Backend (2 minutes)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env if needed (defaults work for local development)
npm start
```

✅ Backend should be running on http://localhost:5000

## Step 2: Setup Frontend (2 minutes)
Open a **new terminal**:
```bash
cd frontend
npm install
npm start
```

✅ Frontend should open automatically at http://localhost:3000

## Step 3: Create First Admin (1 minute)

1. Register at http://localhost:3000/register
   - Use any details (e.g., admin@test.com / admin123)
   
2. Open MongoDB (any tool or shell):
```bash
mongo
use donateo
db.users.updateOne({email: "admin@test.com"}, {$set: {role: "admin"}})
```

3. Logout and login again - you now have admin access!

## Test the Flow

1. **As Admin:** Approve items in Admin Panel
2. **As Donor:** Create an item at /donate
3. **As Receiver:** Register new user with "Receive Items" role, browse and request
4. **As Donor:** Approve request in Dashboard

## Default Accounts for Testing

Create these manually via registration:
- **Admin:** admin@test.com / admin123 (then update role in DB)
- **Donor:** donor@test.com / donor123
- **Receiver:** receiver@test.com / receiver123

## Troubleshooting

**MongoDB not running?**
```bash
mongod
# or
brew services start mongodb-community  # Mac
sudo systemctl start mongod            # Linux
net start MongoDB                      # Windows
```

**Port already in use?**
- Change PORT in backend/.env
- Kill the process using the port

**Can't connect?**
- Check MongoDB is running on port 27017
- Verify .env MONGODB_URI is correct

That's it! You're ready to go! 🚀
