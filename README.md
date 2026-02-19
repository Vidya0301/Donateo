# Donateo - Community Donation Platform

A full-stack MERN application that enables community members to donate and receive unused items for free, promoting sustainability and helping those in need.

## 🌟 Features

### For Donors
- Post items with photos, descriptions, and location
- Track donation status (Pending, Available, Requested, Donated)
- Manage item requests from receivers
- View donation history and impact

### For Receivers
- Browse available items with filters
- Request items based on needs
- Track received items
- Connect with donors

### For Admins
- Approve/reject item posts
- Manage users (activate/deactivate)
- View platform statistics
- Monitor all activities

### General Features
- User authentication with JWT
- Role-based access control (Donor, Receiver, Admin)
- Responsive design with blue/green color theme
- Real-time status updates
- Location-based filtering
- Category-based organization

## 🎨 Design Philosophy

The application features a nature-inspired design with:
- **Forest Green & Ocean Blue**: Representing trust, growth, and sustainability
- **Organic Patterns**: Subtle gradients and natural textures
- **Distinctive Typography**: Crimson Pro for headings, Poppins for body
- **Smooth Animations**: Thoughtful transitions and micro-interactions
- **Accessible Interface**: Clear hierarchy and intuitive navigation

## 📋 Categories

- 👕 Clothes
- 📚 Books
- 🎒 Bags
- 🍎 Food (non-perishable)
- 🏠 Household Items
- ✨ Other

## 🚀 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **React** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Icons** - Icon library
- **React Toastify** - Notifications

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/donateo
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

4. Start MongoDB:
```bash
mongod
```

5. Run the server:
```bash
npm start
# or for development
npm run dev
```

Server runs on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

Application runs on http://localhost:3000

## 🔐 Default Admin Account

To create an admin account, you can either:

1. **Via MongoDB directly**:
```javascript
db.users.insertOne({
  name: "Admin",
  email: "admin@donateo.org",
  password: "$2a$10$...", // Use bcrypt to hash your password
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

2. **Via Registration API** (then update role in database):
```bash
# Register normally, then update role:
db.users.updateOne(
  { email: "youremail@example.com" },
  { $set: { role: "admin" } }
)
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Items
- `GET /api/items` - Get all approved items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item (Donor)
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `POST /api/items/:id/request` - Request item (Receiver)
- `PUT /api/items/:id/donate/:userId` - Approve donation (Donor)
- `GET /api/items/my/donations` - Get my donations
- `GET /api/items/my/received` - Get received items

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user status
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/items` - Get all items (including pending)
- `PUT /api/admin/items/:id/approve` - Approve item
- `DELETE /api/admin/items/:id` - Remove item
- `GET /api/admin/stats` - Get dashboard statistics

## 🎯 User Roles

### Donor
- Can post items for donation
- Receive and approve requests
- Track donation history
- Can also browse and request (dual role support)

### Receiver
- Browse available items
- Request needed items
- Track received items
- Cannot post donations

### Admin
- All donor and receiver permissions
- Approve/reject posts
- Manage users
- View analytics

## 📱 Screenshots & Usage

### Home Page
- Introduction to the platform
- How it works section
- Category showcase
- Impact statistics

### Browse Items
- Filter by category and location
- Search functionality
- Item details with donor info
- Request button for receivers

### Dashboard
- Personal stats overview
- My donations/received items
- Manage requests
- Quick actions

### Admin Panel
- Platform statistics
- Pending approvals
- User management
- Item oversight

## 🌱 Contributing

This is a community-driven project. We welcome contributions!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Support

For support, email support@donateo.org or open an issue in the repository.

## 🌟 Impact

Through this platform we aim to:
- Reduce waste by promoting reuse
- Support students and families in need
- Build stronger, more connected communities
- Create a culture of giving and sustainability

---

**Built with ❤️ for the community**
