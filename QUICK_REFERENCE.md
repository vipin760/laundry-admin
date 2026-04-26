# Quick Reference Guide - Admin Dashboard

## 🎯 Login to Dashboard

1. **Start the dev server**
   ```bash
   npm run dev
   ```

2. **Navigate to** `http://localhost:5173`

3. **Login with any credentials**
   - Email: `admin@example.com` (or any email)
   - Password: `any value`

## 🗂️ Add a New Page

### Step 1: Create the page in `src/pages/`
```tsx
// src/pages/NewPage.tsx
import React from 'react';
import { AdminLayout } from '../layouts/AdminLayout';

export const NewPage: React.FC = () => {
  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-8">New Page Title</h1>
      {/* Your content here */}
    </AdminLayout>
  );
};
```

### Step 2: Add route in `src/App.tsx`
```tsx
import { NewPage } from './pages/NewPage';

<Route
  path="/newpage"
  element={
    <ProtectedRoute>
      <NewPage />
    </ProtectedRoute>
  }
/>
```

### Step 3: Add link in `src/components/Sidebar.tsx`
```tsx
<Link to="/newpage" className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800">
  <svg className="w-6 h-6 flex-shrink-0">
    {/* Icon SVG */}
  </svg>
  {isOpen && <span className="ml-4">New Page</span>}
</Link>
```

## 🎨 Tailwind CSS Quick Class Reference

```jsx
// Spacing
className="p-4 m-4 px-6 py-2 gap-4"

// Colors
className="bg-blue-600 text-white text-gray-700"

// Layout
className="flex flex-col items-center justify-between"
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"

// Sizing
className="w-full h-64 min-h-screen max-w-md"

// Borders & Shadows
className="border border-gray-200 rounded-lg shadow-md"

// Hover & Transitions
className="hover:bg-gray-800 transition-colors duration-300"

// Responsive
className="hidden md:flex lg:grid"
className="text-sm md:text-base lg:text-lg"
```

## 🔑 Using useAuth Hook

```tsx
import { useAuth } from '../context/AuthContext';

export const MyComponent: React.FC = () => {
  const { isAuthenticated, user, login, logout } = useAuth();

  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.email}</p>}
    </div>
  );
};
```

## 📊 Adding State Management

### Option 1: Using React Context (already setup)
```tsx
// Create new context in src/context/
import { createContext, useContext, useState, ReactNode } from 'react';

interface DataContextType {
  data: string[];
  addData: (item: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<string[]>([]);

  const addData = (item: string) => setData([...data, item]);

  return (
    <DataContext.Provider value={{ data, addData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
```

### Option 2: Install Zustand (Recommended)
```bash
npm install zustand
```

## 🛠️ Integrating with Backend API

### Example: Replace mock login with API call
```tsx
// src/context/AuthContext.tsx
const login = async (email: string, password: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    setIsAuthenticated(true);
    setUser(data.user);
    localStorage.setItem('authToken', data.token);
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

## 🎛️ Customizing Tailwind

### Edit `tailwind.config.js` to add custom colors
```js
theme: {
  extend: {
    colors: {
      primary: '#3B82F6',
      secondary: '#1F2937',
      accent: '#10B981',
    },
    spacing: {
      'sidebar': '256px',
    }
  },
}
```

### Use custom colors
```jsx
<div className="bg-primary text-secondary">
  Custom branded colors
</div>
```

## 🚀 Performance Tips

1. **Code Splitting**: Add lazy loading for pages
```tsx
import { lazy, Suspense } from 'react';

const UsersPage = lazy(() => import('./pages/UsersPage'));

<Suspense fallback={<div>Loading...</div>}>
  <UsersPage />
</Suspense>
```

2. **Memoization**: Prevent unnecessary re-renders
```tsx
const MyComponent = React.memo(() => <div>Optimized</div>);
```

3. **Image Optimization**: Use next-gen formats
```jsx
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.png" alt="fallback" />
</picture>
```

## 🔧 Environment Variables

Create `.env` file in project root:
```
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Admin Dashboard
```

Access in code:
```tsx
const apiUrl = import.meta.env.VITE_API_URL;
```

## 📱 Responsive Breakpoints (Tailwind)

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

Usage:
```jsx
<div className="w-full md:w-1/2 lg:w-1/3">
  Responsive width
</div>
```

## 🐛 Debugging

### Enable React DevTools
```bash
npm install react-devtools
```

### Using console
```tsx
const { isAuthenticated } = useAuth();
console.log('Auth status:', isAuthenticated);
```

### Check Vite HMR
Look at browser console for hot reload status

## 📦 Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm preview

# Check bundle size
npm install -D vite-plugin-visualizer
```

## 🔗 Useful Links

- [Tailwind CSS Docs](https://tailwindcss.com)
- [React Router Docs](https://reactrouter.com)
- [Vite Docs](https://vitejs.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 💡 Best Practices

✅ Keep components small and focused  
✅ Use TypeScript for type safety  
✅ Use `useCallback` for event handlers  
✅ Separate concerns: pages, components, logic  
✅ Keep context lean, add state lib for complex state  
✅ Document complex components  
✅ Use semantic HTML  
✅ Test before committing  

---

**Quick Start Template**:
1. `npm run dev` - Start development
2. Open browser to `http://localhost:5173`
3. Login with any email
4. Explore the dashboard!
