# NutriWealth UI

Modern React + TypeScript frontend for the NutriWealth food & wellness tracking application.

## 🏗️ Architecture

- **Framework**: React 18.3
- **Build Tool**: Vite 5.4
- **UI Library**: Tailwind CSS + Shadcn/ui
- **Routing**: React Router 6
- **State Management**: React Context API + TanStack Query
- **PWA**: Progressive Web App enabled
- **Features**:
  - Responsive design
  - Offline support
  - Real-time updates
  - Role-based access (Participant/Caretaker)
  - AI-powered food analysis
  - Receipt and workout tracking

## 📁 Project Structure

```
ui/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Shadcn components
│   │   ├── layout/        # Layout components
│   │   └── features/      # Feature-specific components
│   ├── pages/             # Page components
│   │   ├── Auth.tsx       # Authentication
│   │   ├── Dashboard.tsx  # Main dashboard
│   │   ├── Food.tsx       # Food tracking
│   │   ├── Receipts.tsx   # Receipt management
│   │   ├── Workouts.tsx   # Workout tracking
│   │   └── Caretaker*.tsx # Caretaker views
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   └── RoleContext.tsx
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # API client and utilities
│   │   ├── api.ts         # Backend API client
│   │   └── utils.ts       # Helper functions
│   ├── types/             # TypeScript types
│   ├── main.tsx           # Application entry
│   └── index.css          # Global styles
├── public/                # Static assets
│   ├── manifest.json      # PWA manifest
│   └── icons/            # App icons
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm or yarn

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# Backend API URL
VITE_API_URL=http://localhost:8000

# Tenant ID
VITE_TENANT_ID=demo

# Optional: Enable debug mode
VITE_DEBUG=true
```

### 3. Run Development Server

```bash
npm run dev

# App runs on http://localhost:5173
```

### 4. Build for Production

```bash
npm run build

# Preview production build
npm run preview
```

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build            # Production build
npm run build:dev        # Development build

# Quality
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

## 🎨 Key Features

### Food Tracking
- AI-powered food analysis from images
- Nutritional information breakdown
- Meal history and trends
- Vegetarian/dietary preferences

### Receipt Management
- Upload and analyze grocery receipts
- Track food purchases
- Cost analysis
- Item categorization

### Workout Tracking
- Log exercises and activities
- Track duration and intensity
- View workout history
- Performance analytics

### Caretaker Mode
- Monitor participant's nutrition
- View aggregated insights
- Manage permissions
- Leave notes and comments

### PWA Features
- Install as mobile app
- Offline functionality
- Background sync
- Push notifications (planned)

## 🔧 Configuration

### API Integration

The app communicates with the backend API via the `backendApi` client in `src/lib/api.ts`:

```typescript
import { backendApi } from '@/lib/api';

// Example: Fetch food entries
const entries = await backendApi.get('/food_entries');

// Example: Analyze food image
const analysis = await backendApi.post('/analyze', {
  type: 'food',
  image: imageData
});
```

### Environment Variables

- `VITE_API_URL`: Backend API URL (required)
- `VITE_TENANT_ID`: Tenant identifier (required)
- `VITE_DEBUG`: Enable debug logging (optional)

### PWA Configuration

Edit `public/manifest.json` to customize:
- App name and description
- Theme colors
- App icons
- Display mode

## 🎨 Styling

### Tailwind CSS

The app uses Tailwind CSS for styling. Key configurations:

- **Theme**: Defined in `tailwind.config.ts`
- **Dark Mode**: Supported via `next-themes`
- **Components**: Shadcn/ui components with Radix UI

### Customization

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Add custom colors
      }
    }
  }
}
```

## 🧪 Testing

```bash
# Run unit tests (when configured)
npm test

# Run E2E tests (when configured)
npm run test:e2e
```

## 📦 Deployment

### CloudFront + S3 (Recommended)

```bash
# Build production bundle
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Docker

```bash
# Build production image
docker build -t nutriwealth-ui .

# Run container
docker run -p 80:80 nutriwealth-ui
```

### Vercel/Netlify

1. Connect your repository
2. Set environment variables
3. Deploy automatically on push

Build settings:
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## 🐛 Troubleshooting

**Port conflicts**
- Default port is 5173
- Change with: `npm run dev -- --port 3000`

**API connection errors**
- Verify `VITE_API_URL` in `.env`
- Check backend is running
- Check CORS configuration

**Build errors**
- Clear cache: `rm -rf node_modules/.vite`
- Reinstall: `rm -rf node_modules && npm install`
- Check Node version: `node --version`

**PWA not updating**
- Clear service worker cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## 🔐 Security

- Never commit `.env` files
- API keys should be backend-only
- Use HTTPS in production
- Implement CSP headers
- Regular dependency updates

## 📚 Related Repositories

- **Backend**: [ajna_nutri_wealth_backend_v2](https://github.com/ajnacloud-ksj/ajna_nutri_wealth_backend_v2)
- **Deployment**: [food-sense-ai-tracker](https://github.com/ajnacloud-dev/food-sense-ai-tracker-3b84f458)

## 📚 Key Dependencies

- **React**: UI framework
- **Vite**: Build tool
- **TanStack Query**: Data fetching & caching
- **React Router**: Navigation
- **Tailwind CSS**: Styling
- **Shadcn/ui**: UI components
- **Radix UI**: Accessible primitives
- **Lucide React**: Icons
- **date-fns**: Date utilities
- **Recharts**: Data visualization
- **Zod**: Schema validation

## 📄 License

MIT

---

**Last Updated:** February 4, 2026  
**Version:** 2.1.0 - Async Analysis + Cognito Auth
