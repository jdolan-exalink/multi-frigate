import { useState, useEffect } from "react";
import { isProduction } from "../shared/env.const";
import { useAuth } from './useAuth';

export const useRealmAccessRoles = () => {
    const [user] = useAuth();
    if (!user) return [];
    // Solo rol simple: admin o user
    return [user.role];
}