# 🚀 Billun Backend API

Backend API for the Billun Equipment Anomaly Management and Tracking System.

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate to backend**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up admin user**
   ```bash
   npm run create:admin
   ```

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📊 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run test` | Run API tests |
| `npm run test:workshop` | Test workshop endpoints |
| `npm run test:equipment` | Test equipment creation |
| `npm run seed` | Seed workshop data |
| `npm run seed:users` | Seed user data |
| `npm run create:admin` | Create admin user |
| `npm run setup` | Full setup (install + create admin) |
| `npm run clean` | Clean install dependencies |

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/billun_atelier
MONGO_URI_TEST=mongodb://localhost:27017/billun_atelier_test

# Server
PORT=5000

# Security
JWT_SECRET=your_super_secret_jwt_key_here

# Optional
NODE_ENV=development
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Workshop Management
- `GET /api/workshop/anomalies` - Get anomalies
- `POST /api/workshop/anomalies` - Create anomaly
- `GET /api/workshop/equipment` - Get equipment
- `POST /api/workshop/equipment` - Create equipment
- `GET /api/workshop/personnel` - Get personnel
- `POST /api/workshop/personnel` - Create personnel
- `GET /api/workshop/maintenance` - Get maintenance schedule
- `POST /api/workshop/maintenance` - Schedule maintenance

### Statistics
- `GET /api/workshop/stats/anomalies` - Get anomaly statistics

## 🗄️ Database Models

### User
- Authentication and user management
- Roles: admin, gestionnaire, atelier

### Equipment
- Equipment/vehicle information
- Status tracking
- Maintenance scheduling

### Anomaly
- Issue reporting and tracking
- Photo attachments
- Status workflow

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in requests:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   └── server.js        # Main server file
├── uploads/             # File uploads
├── test-*.js           # Test files
├── seed-*.js           # Database seeding
├── .env                # Environment variables
├── .env.example        # Environment template
└── package.json        # Dependencies and scripts
```

## 🧪 Testing

Run tests to verify API functionality:

```bash
# Test all endpoints
npm run test

# Test specific modules
npm run test:workshop
npm run test:equipment
```

## 🌱 Seeding Data

Populate the database with test data:

```bash
# Seed workshop data (equipment, personnel, anomalies)
npm run seed

# Seed users
npm run seed:users

# Create admin user
npm run create:admin
```

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MONGO_URI in .env
   - Ensure MongoDB is running

2. **Port Already in Use**
   - Change PORT in .env
   - Kill process using the port

3. **JWT Token Invalid**
   - Check JWT_SECRET in .env
   - Ensure token is properly formatted

### Logs

Check server logs for debugging:
```bash
npm run logs
```

## 🔄 Development Workflow

1. Make changes to code
2. Server auto-restarts (with nodemon)
3. Test endpoints with Postman or curl
4. Run tests to verify functionality

## 📦 Dependencies

### Production
- express - Web framework
- mongoose - MongoDB ODM
- jsonwebtoken - JWT authentication
- bcryptjs - Password hashing
- cors - Cross-origin requests
- multer - File uploads
- sharp - Image processing

### Development
- nodemon - Auto-restart server

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

This project is proprietary software for Billun.
