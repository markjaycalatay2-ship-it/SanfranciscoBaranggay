const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with your project credentials
// For local testing - use service account key file
// For Vercel deployment - use environment variables

// Mock data store for local development without Firebase credentials
const mockData = {
    users: [
        { id: 1, full_name: 'Test Resident 1', username: 'resident1', role: 'resident', status: 'approved', age: 25, gender: 'Male', contact_number: '09123456789', address: 'Test Address 1' },
        { id: 2, full_name: 'Test Resident 2', username: 'resident2', role: 'resident', status: 'pending', age: 30, gender: 'Female', contact_number: '09987654321', address: 'Test Address 2' }
    ],
    reports: [],
    logs: []
};

const mockFirestore = {
    collection: (name) => ({
        get: async () => ({
            docs: mockData[name]?.map(doc => ({ id: doc.id, data: () => doc })) || []
        }),
        doc: (id) => ({
            get: async () => {
                const doc = mockData[name]?.find(d => d.id === id);
                return { exists: !!doc, data: () => doc };
            },
            set: async (data) => {
                if (!mockData[name]) mockData[name] = [];
                const idx = mockData[name].findIndex(d => d.id === id);
                if (idx >= 0) mockData[name][idx] = { ...data, id };
                else mockData[name].push({ ...data, id });
            },
            update: async (data) => {
                if (!mockData[name]) mockData[name] = [];
                const idx = mockData[name].findIndex(d => d.id === id);
                if (idx >= 0) mockData[name][idx] = { ...mockData[name][idx], ...data };
            },
            delete: async () => {
                if (!mockData[name]) return;
                mockData[name] = mockData[name].filter(d => d.id !== id);
            }
        }),
        add: async (data) => {
            if (!mockData[name]) mockData[name] = [];
            const id = Date.now().toString();
            mockData[name].push({ ...data, id });
            return { id };
        },
        where: (field, op, value) => ({
            get: async () => ({
                docs: mockData[name]?.filter(doc => {
                    if (op === '==') return doc[field] === value;
                    return true;
                }).map(doc => ({ id: doc.id, data: () => doc })) || []
            })
        })
    })
};

let db = mockFirestore;
let useMock = true;

// Initialize Firebase and test if it works
(async () => {
    try {
        // Check for service account key file (local development)
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        
        if (fs.existsSync(serviceAccountPath)) {
            // Use service account key for local development
            const serviceAccount = require(serviceAccountPath);
            
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            console.log('Firebase initialized with service account key');
        } else if (process.env.FIREBASE_PROJECT_ID) {
            // Use environment variables for Vercel deployment
            if (!admin.apps.length) {
                admin.initializeApp({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
                    })
                });
            }
            console.log('Firebase initialized with environment variables');
        } else {
            // Try default credentials (works if logged in with gcloud CLI)
            if (!admin.apps.length) {
                admin.initializeApp({
                    projectId: "barangay-sanfrancisco"
                });
            }
            console.log('Firebase initialized with default credentials');
        }
        
        const testDb = admin.firestore();
        
        // Test if Firestore actually works
        try {
            await testDb.collection('test').get();
            db = testDb;
            useMock = false;
            console.log('✅ Firebase Firestore connected successfully!');
        } catch (testError) {
            console.log('⚠️ Firestore test failed:', testError.message);
            console.log('Using mock data for local development...');
        }
    } catch (e) {
        console.log('⚠️ Firebase initialization error:', e.message);
        console.log('Using mock data for local development...');
    }
})();

// Helper functions for Firestore operations
async function getCollection(collectionName) {
    if (!db) throw new Error('Firestore not initialized');
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getDocById(collectionName, id) {
    if (!db) throw new Error('Firestore not initialized');
    const doc = await db.collection(collectionName).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function addDocument(collectionName, data) {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = await db.collection(collectionName).add(data);
    return docRef.id;
}

async function setDocument(collectionName, id, data) {
    if (!db) throw new Error('Firestore not initialized');
    await db.collection(collectionName).doc(id).set(data);
}

async function updateDocument(collectionName, id, data) {
    if (!db) throw new Error('Firestore not initialized');
    await db.collection(collectionName).doc(id).update(data);
}

async function deleteDocument(collectionName, id) {
    if (!db) throw new Error('Firestore not initialized');
    await db.collection(collectionName).doc(id).delete();
}

async function queryCollection(collectionName, field, operator, value) {
    if (!db) throw new Error('Firestore not initialized');
    const snapshot = await db.collection(collectionName).where(field, operator, value).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
    db,
    admin,
    getCollection,
    getDocById,
    addDocument,
    setDocument,
    updateDocument,
    deleteDocument,
    queryCollection
};
