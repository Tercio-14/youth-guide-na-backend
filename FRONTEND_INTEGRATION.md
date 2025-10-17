# Frontend Integration Guide

This document explains how to connect the YouthGuide NA frontend to the backend API.

## 🔗 Backend API Integration Points

### Required Frontend Changes

#### 1. Install Firebase SDK in Frontend
```bash
cd ../youth-guide-na
npm install firebase
```

#### 2. Create Firebase Configuration
Create `src/config/firebase.js` in the frontend:
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

#### 3. Add Environment Variables to Frontend
Create `.env` in frontend root:
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=youthguide-na-dev.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=youthguide-na-dev
REACT_APP_FIREBASE_STORAGE_BUCKET=youthguide-na-dev.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

#### 4. Create API Client
Create `src/utils/api.js` in frontend:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async post(endpoint, data, token = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  async get(endpoint, token = null) {
    return this.request(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  async put(endpoint, data, token = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  async delete(endpoint, token = null) {
    return this.request(endpoint, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }
}

export const apiClient = new ApiClient();
```

#### 5. Create Auth Context
Create `src/contexts/AuthContext.tsx` in frontend:
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { apiClient } from '../utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setUser(user);
        setToken(token);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### 6. Update App.tsx
Wrap your app with AuthProvider:
```typescript
import { AuthProvider } from './contexts/AuthContext';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Your existing routes */}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

#### 7. Update Auth.tsx
Replace the mock authentication:
```typescript
import { useAuth } from '../contexts/AuthContext';

const Auth = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        await login(email, password);
        toast.success("Welcome back!");
        navigate("/chat");
      } else {
        await register(email, password);
        toast.success("Account created!");
        navigate("/profile");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    }
  };

  // Rest of component remains the same
};
```

#### 8. Update Profile.tsx
Save profile to backend:
```typescript
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';

const Profile = () => {
  const { token } = useAuth();
  // ... existing state ...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !ageBracket || skills.length === 0 || interests.length === 0) {
      toast.error("Please complete all sections");
      return;
    }

    try {
      await apiClient.post('/users/profile', {
        firstName,
        ageBracket,
        skills,
        interests
      }, token);
      
      toast.success(`Welcome, ${firstName}! Let's find opportunities for you.`);
      navigate("/chat");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    }
  };

  // Rest of component remains the same
};
```

#### 9. Update Chat.tsx
Connect to real backend:
```typescript
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';

const Chat = () => {
  const { user, token } = useAuth();
  // ... existing state ...

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await apiClient.post('/chat', {
        message: text,
        conversationId: null // Will be handled by backend
      }, token);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: response.message,
        timestamp: new Date(),
        opportunities: response.opportunities,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      toast.error("Sorry, I couldn't process that. Please try again.");
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Rest of component remains the same
};
```

#### 10. Add Protected Routes
Create `src/components/ProtectedRoute.tsx`:
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
```

Then update your routes in App.tsx:
```typescript
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/auth" element={<Auth />} />
  <Route 
    path="/profile" 
    element={
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    } 
  />
  <Route 
    path="/chat" 
    element={
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    } 
  />
  {/* ... other protected routes */}
</Routes>
```

## 🚀 Testing the Integration

1. **Start backend:**
   ```bash
   cd youth-guide-na-backend
   npm run dev
   ```

2. **Start frontend:**
   ```bash
   cd youth-guide-na
   npm run dev
   ```

3. **Test authentication flow:**
   - Visit http://localhost:5173/auth
   - Create an account
   - Complete profile setup
   - Try sending a chat message

## 📋 Implementation Checklist

- [ ] Backend server running on localhost:3001
- [ ] Firebase project configured with Auth and Firestore
- [ ] Frontend Firebase SDK installed and configured
- [ ] AuthContext implemented and working
- [ ] API client created and tested
- [ ] Auth.tsx updated to use real authentication
- [ ] Profile.tsx saving to backend
- [ ] Chat.tsx calling backend API (even if RAG not yet implemented)
- [ ] Protected routes working
- [ ] Error handling in place

## 🎯 Next Steps

After completing the integration:

1. **Sprint 1 Week 1**: Implement RAG pipeline in backend
2. **Sprint 2 Week 2**: Complete all CRUD operations
3. **Sprint 3 Week 3**: Add analytics and prepare for user testing

This integration will give you a working authentication system and API connection, even before the RAG pipeline is fully implemented. The chat will work with placeholder responses until the embedding and LLM services are added.