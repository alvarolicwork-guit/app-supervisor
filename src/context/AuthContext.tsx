'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { userService, UserProfile } from '@/services/userService';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    isSupervisor: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
    isSupervisor: false,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                setUser(currentUser);
                try {
                    const profile = await userService.getUserProfile(currentUser.uid);
                    setUserProfile(profile);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUserProfile(null);
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
        setUser(null);
        setUserProfile(null);
        router.push('/login');
    };

    const isAdmin = userProfile?.role === 'admin';
    const isSupervisor = userProfile?.role === 'supervisor';

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            isAdmin,
            isSupervisor,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};
