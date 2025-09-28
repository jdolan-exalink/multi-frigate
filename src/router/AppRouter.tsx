import { Navigate, Route, Routes } from "react-router-dom";
import { routes } from "./routes";
import { v4 as uuidv4 } from 'uuid';
import { routesPath } from "./routes.path";
import { ProtectedRoute } from './ProtectedRoute';

const AppRouter = () => {

    return (
        <Routes>
            {routes.map(({ path, component }) =>
                path === routesPath.LOGIN_PATH
                    ? <Route key={uuidv4()} path={path} element={component} />
                    : <Route key={uuidv4()} path={path} element={<ProtectedRoute>{component}</ProtectedRoute>} />
            )}
            <Route key={uuidv4()} path="*" element={<Navigate to={routesPath.MAIN_PATH} replace />} />
        </Routes>
    )
}

export default AppRouter