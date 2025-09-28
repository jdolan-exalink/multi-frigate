import { useAuth } from './useAuth';

export const useRealmUser = () => {
    const [user] = useAuth();
    if (!user) return null;
    return {
        id: user.username,
        username: user.username,
        givenName: '',
        familyName: '',
        role: user.role
    };
}