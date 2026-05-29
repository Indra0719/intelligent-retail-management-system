🛒 Intelligent Retail Management System (IRMS)

AI-Driven Pricing & Coupon Automation for E-commerce


Executive Summary
IRMS is a production-grade full-stack MERN application that automates pricing decisions, coupon generation, and inventory analysis for e-commerce businesses using AI. It eliminates manual pricing work, reduces inventory waste through dynamic markdowns, and enables data-driven decisions — all powered by a real-time AI assistant using Groq's Llama 3.1 model.
Built as part of a team software engineering project, this system addresses a real problem faced by small e-commerce stores: pricing stale inventory efficiently without human intervention.

🚀 Key Features
🔹 Dynamic Pricing Engine

Calculates an urgency score (0–1) for every product using a weighted formula:

Product age → 70% weight
Stock level → 30% weight


Applies category-specific multipliers (Electronics: 1.5×, Food: 2.0×, Clothing: 1.2×)
Automatically adjusts prices with up to 40% markdown
Enforces a price floor of 50% of base price to protect margins
Logs every pricing decision with full audit trail

🔹 Automated Coupon System
TypeTriggerScopeThank YouAfter every purchasePersonalLoyaltyMilestone orders reachedPersonalClearanceLow stock + high product ageGlobalCampaignAdmin-created manuallyGlobal
🔹 AI-Powered Inventory Insights

Integrated with Groq API (Llama 3.1) for natural language insights
Provides real-time:

Inventory health assessments
Critical product alerts (overstocked, aging, low margin)
Actionable business recommendations



🔹 Analytics Dashboard

Revenue and order tracking over time
Coupon performance and redemption rates
Top-selling products by revenue
Inventory health monitoring with urgency scores

🔹 Authentication & Role Management

JWT-based authentication
Role-based access control (Admin vs Customer)
Secure protected routes on both frontend and backend


🛠️ Tech Stack
LayerTechnologyFrontendReact (Vite), Tailwind CSSBackendNode.js, Express.jsDatabaseMongoDB (Mongoose ODM)AIGroq API — Llama 3.1AuthJWT (role-based)Image UploadCloudinary + MulterSchedulingnode-cron (automated pricing runs)Dev ToolsNodemon, dotenv

🏗️ System Architecture
IRMS/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── middleware/
│   │   └── auth.js                # JWT middleware
│   ├── models/
│   │   ├── Product.js             # Product schema with price history
│   │   ├── PricingLog.js          # Audit log for pricing decisions
│   │   ├── Coupon.js              # Coupon types and rules
│   │   ├── User.js                # User + roles
│   │   └── Settings.js            # Global app settings
│   ├── routes/
│   │   ├── products.js
│   │   ├── pricing.js
│   │   ├── coupons.js
│   │   ├── orders.js
│   │   └── auth.js
│   ├── services/
│   │   └── pricingEngine.js       # Core pricing algorithm
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AiChat.jsx         # Groq AI chat interface
│   │   │   ├── Navbar.jsx
│   │   │   └── ImageCarousel.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── CartContext.jsx
│   │   ├── api/
│   │   │   └── axios.js
│   │   └── App.jsx
│   └── index.html
└── README.md

⚙️ Setup Instructions
Prerequisites

Node.js v18+
MongoDB (local or Atlas)
Groq API key (free at console.groq.com)
Cloudinary account (free tier)

1. Clone the Repository
bashgit clone https://github.com/Indra0719/intelligent-retail-management-system.git
cd intelligent-retail-management-system
2. Configure Environment Variables
Create a .env file in the backend/ folder:
envMONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
3. Start the Application
bash# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
Frontend runs on http://localhost:5173
Backend runs on http://localhost:5000

🧠 Pricing Algorithm
The core pricing engine (pricingEngine.js) works as follows:
Urgency Score = (0.7 × Age Factor) + (0.3 × Stock Factor)

Age Factor  = min(days_since_catalog / 90, 1)
Stock Factor = min(current_stock / 200, 1)

Markdown % = Urgency Score × 40% × Category Multiplier

Final Price = Base Price × (1 - Markdown%) 
            — floored at 50% of Base Price

📊 Business Impact

Reduces manual pricing effort — engine runs automatically via cron job
Prevents inventory waste — aging products get dynamically discounted
Increases customer retention — automated loyalty and thank-you coupons
AI-driven decisions — natural language inventory insights replace manual reporting


👥 Team Project
This project was built as part of a graduate-level Software Engineering course, focusing on full-stack development, system design, and AI integration.

Skills Demonstrated

Full-stack MERN development (MongoDB, Express, React, Node.js)
RESTful API design and implementation
AI/LLM integration (Groq API, Llama 3.1)
JWT authentication and role-based access control
Algorithm design (dynamic pricing engine)
Database schema design with Mongoose
Cloud image storage with Cloudinary
Automated scheduling with node-cron
React state management with Context API
- JWT authentication and role-based access control
- Dynamic pricing algorithm design
- MongoDB schema design with Mongoose
- Cloud image storage with Cloudinary
- Automated scheduling with node-cron
