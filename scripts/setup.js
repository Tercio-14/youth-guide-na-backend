#!/usr/bin/env node

// Quick setup script for YouthGuide NA
console.log('🚀 YouthGuide NA Setup Helper\n');

const steps = [
  '1. 🔥 Complete Firebase Setup:',
  '   → Go to https://console.firebase.google.com/project/youthguide-na',
  '   → Enable Authentication (Email/Password)',
  '   → Create Firestore Database (test mode)',
  '   → Generate Service Account Key',
  '   → Copy credentials to backend/.env\n',
  
  '2. 📦 Install Dependencies:',
  '   Backend: cd youth-guide-na-backend && npm install',
  '   Frontend: cd youth-guide-na && npm install firebase\n',
  
  '3. 🔧 Configure Environment:',
  '   Backend: Copy .env.example to .env and add Firebase credentials',
  '   Frontend: .env already created with your Firebase config\n',
  
  '4. 🎯 Test Setup:',
  '   Backend: npm run dev (should run on :3001)',
  '   Frontend: npm run dev (should run on :5173)',
  '   Test: Visit localhost:5173/auth to register\n',
  
  '5. ✅ Verify Integration:',
  '   → Register a new account',
  '   → Complete profile setup',
  '   → Check if data saves to Firestore',
  '   → Try sending a chat message (will get placeholder response)\n',
  
  '6. 🚀 Next: Sprint 1 Implementation',
  '   → Follow IMPLEMENTATION_PLAN.md',
  '   → Implement RAG pipeline',
  '   → Add LLM integration'
];

steps.forEach(step => console.log(step));

console.log('\n📋 Quick Commands:');
console.log('Backend setup: cd youth-guide-na-backend && npm install && npm run dev');
console.log('Frontend setup: cd youth-guide-na && npm install firebase && npm run dev');
console.log('\n🔗 Important Files Created:');
console.log('→ youth-guide-na/src/config/firebase.js');
console.log('→ youth-guide-na/src/contexts/AuthContext.jsx'); 
console.log('→ youth-guide-na/src/utils/api.js');
console.log('→ youth-guide-na/src/components/ProtectedRoute.jsx');
console.log('→ youth-guide-na/.env');
console.log('\n📖 Read FIREBASE_SETUP.md for detailed instructions');