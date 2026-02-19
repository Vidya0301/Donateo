# Donateo - Complete Setup Guide

This guide will walk you through setting up the Donateo platform from scratch.

## Prerequisites Installation

### 1. Install Node.js
- Download from https://nodejs.org/ (LTS version recommended)
- Verify installation:
```bash
node --version
npm --version
```

### 2. Install MongoDB
- Download from https://www.mongodb.com/try/download/community
- Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

**For Local MongoDB:**
- Start MongoDB service:
  - Windows: `net start MongoDB`
  - Mac: `brew services start mongodb-community`
  - Linux: `sudo systemctl start mongod`

## Project Setup

### Step 1: Clone or Download the Project
```bash
# If using git
git clone <repository-url>
cd wall-of-kindness

# Or extract the downloaded zip file and navigate to it
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Edit the `.env` file:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wall-of-kindness
JWT_SECRET=change_this_to_a_random_secure_string_123456
NODE_ENV=development
```

**Start the backend server:**
```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

You should see:
```
Server running on port 5000
MongoDB connected successfully
```

### Step 3: Frontend Setup

Open a **new terminal window** (keep backend running):

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The browser should automatically open to http://localhost:3000

## Creating Your First Admin Account

### Option 1: Using MongoDB Compass (Recommended for Beginners)

1. Download and install MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Connect to `mongodb://localhost:27017`
3. Find the `donateo` database
4. Open the `users` collection
5. First, register a normal account through the website
6. In Compass, find your user document and edit it
7. Change the `role` field from `"donor"` to `"admin"`
8. Save the document
9. Logout and login again to access admin features

### Option 2: Using MongoDB Shell

```bash
# Connect to MongoDB
mongo

# Switch to the database
use donateo

# First register through the website, then update:
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### Option 3: Using the API with Postman

1. Download Postman: https://www.postman.com/downloads/
2. Register a user:
   - POST http://localhost:5000/api/auth/register
   - Body (JSON):
   ```json
   {
     "name": "Admin User",
     "email": "admin@example.com",
     "password": "admin123",
     "role": "donor"
   }
   ```
3. Manually change role in database as shown in Option 1 or 2

## Testing the Application

### 1. Create Test Users

**Donor Account:**
- Go to http://localhost:3000/register
- Name: "John Donor"
- Email: "donor@test.com"
- Password: "test123"
- Role: "Donate Items"

**Receiver Account:**
- Go to http://localhost:3000/register
- Name: "Jane Receiver"
- Email: "receiver@test.com"
- Password: "test123"
- Role: "Receive Items"

### 2. Test Donation Flow

1. **Login as Donor:**
   - Click "Donate New Item"
   - Upload an image (any image will work for testing)
   - Fill in item details
   - Submit for approval

2. **Login as Admin:**
   - Go to Admin Panel
   - See pending item
   - Approve the item

3. **Login as Receiver:**
   - Browse Items
   - Find the approved item
   - Click "Request Item"

4. **Back to Donor:**
   - Dashboard shows request
   - Approve the request

## Common Issues and Solutions

### Issue: MongoDB Connection Error
**Solution:**
- Ensure MongoDB is running: `mongod` or check service
- Verify connection string in `.env`
- Check if port 27017 is available

### Issue: Port Already in Use
**Solution:**
```bash
# Backend (5000)
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -i :5000

# Frontend (3000)
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000

# Kill the process or change port in .env/package.json
```

### Issue: npm install fails
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install again
npm install
```

### Issue: Images not displaying
**Solution:**
- For development, we're using base64 encoded images
- Images are stored directly in the database
- For production, consider using cloud storage (AWS S3, Cloudinary)

## Production Deployment

### Backend (Heroku Example)

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create new app
heroku create wall-of-kindness-api

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_atlas_uri
heroku config:set JWT_SECRET=your_secret_key
heroku config:set NODE_ENV=production

# Deploy
git subtree push --prefix backend heroku main
```

### Frontend (Netlify Example)

```bash
# Build the app
cd frontend
npm run build

# Deploy to Netlify
# Option 1: Drag and drop the build folder to netlify.com
# Option 2: Use Netlify CLI
npm install -g netlify-cli
netlify deploy --prod
```

### Environment Variables for Production

**Backend:**
- Use MongoDB Atlas for database
- Generate strong JWT_SECRET
- Enable CORS for frontend domain

**Frontend:**
- Update API_URL in `src/services/api.js` to production backend URL

## Next Steps

1. **Customize the Design:**
   - Edit colors in `frontend/src/index.css` (CSS variables)
   - Update fonts in `public/index.html`
   - Modify logos and branding

2. **Add Features:**
   - Email notifications
   - Chat between donor and receiver
   - Map integration for locations
   - Rating system

3. **Enhance Security:**
   - Rate limiting
   - Email verification
   - Two-factor authentication
   - File upload validation

4. **Performance:**
   - Image optimization
   - Caching
   - Database indexing
   - Pagination

## Support

For issues:
1. Check this guide thoroughly
2. Review error messages in terminal
3. Check browser console for frontend errors
4. Open an issue in the repository

Happy coding! 🌟
