# Stock Cap - MERN Stack Trading Platform

A full-stack stock trading platform built with MongoDB, Express.js, React, and Node.js.

## Project Structure

```
Stock-Cap/
├── backend/                 # Express.js API server
│   ├── controller/         # Route controllers
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── middlewares/       # Custom middlewares
│   └── server.js          # Server entry point
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── services/      # API services
│   └── package.json
└── README.md
```

## Features

### Backend (Express.js + MongoDB)
- User authentication (JWT)
- User registration and login
- Stock management
- Order placement
- Portfolio tracking
- Transaction history
- News management
- Protected routes with middleware

### Frontend (React + Vite)
- Modern React with hooks
- Authentication context
- Protected routes
- Responsive design
- Login/Register forms
- Dashboard with stock data
- Clean UI with Tailwind-like CSS

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
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
```bash
# Backend Environment Variables
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/stockcap
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
NODE_ENV=development
```

4. Start the server:
```bash
npm start
# or
node server.js
```

The backend will run on `http://localhost:4000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
# Frontend Environment Variables
VITE_API_URL=http://localhost:4000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

### Stocks
- `GET /api/stocks` - Get all stocks
- `GET /api/stocks/:id` - Get stock by ID
- `POST /api/stocks` - Create stock (admin only)
- `PUT /api/stocks/:id` - Update stock (admin only)

### Orders
- `POST /api/orders` - Place order (protected)
- `GET /api/orders` - Get user orders (protected)

### Transactions
- `POST /api/transactions/deposit` - Deposit funds (protected)
- `POST /api/transactions/withdraw` - Withdraw funds (protected)
- `GET /api/transactions` - Get transaction history (protected)

### Portfolio
- `GET /api/portfolio` - Get user portfolio (protected)

### News
- `GET /api/news` - Get all news
- `POST /api/news` - Create news (admin only)

## Usage

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Register a new account or login
4. Explore the dashboard and features

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT (jsonwebtoken)
- bcryptjs
- CORS
- Helmet
- Morgan

### Frontend
- React 18
- Vite
- React Router DOM
- Axios
- Lucide React (icons)

## Development

### Adding New Features
1. Create models in `backend/models/`
2. Add controllers in `backend/controller/`
3. Define routes in `backend/routes/`
4. Create frontend components in `frontend/src/components/`
5. Add pages in `frontend/src/pages/`

### Database Models
- **User**: username, email, password, role, balance
- **Stock**: symbol, name, currentPrice, volume, etc.
- **Order**: user, stock, type, quantity, price, status
- **Transaction**: user, type, amount, timestamp
- **Portfolio**: user, stock, quantity, avgBuyPrice
- **News**: title, content, author, tags, image
- **Payment**: user, provider, orderId, amount, type, status

## Security Features
- Password hashing with bcrypt
- JWT token authentication
- Protected routes middleware
- Input validation
- CORS configuration
- Helmet security headers

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License
MIT License
