import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { frigateQueryKeys, frigateApi } from "../services/frigate.proxy/frigate.api";
import { getConfigSchema } from "../services/frigate.proxy/frigate.schema";
import { isProduction } from "../shared/env.const";
import { useRealmAccessRoles } from "./useRealmAccessRoles";

export interface AdminRole {
    isLoading: boolean
    isAdmin: boolean
    isError: boolean
}

export const useAdminRole = (): AdminRole => {
    const roles = useRealmAccessRoles();
    const [isAdmin, setIsAdmin] = useState(false);

    const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('token'));

    const { data: adminConfig, isError, isLoading, error } = useQuery({
        queryKey: [frigateQueryKeys.getAdminRole],
        queryFn: frigateApi.getAdminRole,
        staleTime: 1000 * 60 * 60,
        gcTime: 1000 * 60 * 60 * 24,
        enabled: hasToken,
        retry: hasToken,
    });

    useEffect(() => {
        if (!hasToken) {
            setIsAdmin(false);
            return;
        }
        if (isLoading) return;

        const parsedConfig = getConfigSchema.safeParse(adminConfig);
        if (!isProduction) console.log('useAdminRole parsedConfig success:', parsedConfig.success);
        if (!parsedConfig.success) {
            setIsAdmin(true);
            return;
        }
        if (parsedConfig.success) {
            const checkAdmin = roles.some(role => role === parsedConfig.data.value);
            setIsAdmin(checkAdmin);
        } else {
            setIsAdmin(false);
        }
    }, [roles, adminConfig, isLoading, hasToken]);

    useEffect(() => {
        if (isError) {
            console.error("useAdminRole error: ", error?.message);
            setIsAdmin(false);
        }
    }, [isError, error]);

    return { isLoading, isAdmin, isError };
};
