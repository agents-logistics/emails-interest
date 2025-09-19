
export const publicRoutes = [
    "/",
    "/auth/new-verification",
    /^\/agentslink\/[^/]+$/,  // Add regex for /agentslink/[agentLinkId]
    "/api/checkAgentLinkExpiry",  // Public API endpoint
    "/api/getRunDataWithAgents",  // Public API endpoint
    "/api/getAgents",  // Public API endpoint
    "/api/assignAgentsToRunData",
];

export const authRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/error"
];

export const apiAuthPrefix = "/api/auth";

export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
export const DEFAULT_SIGNOUT_REDIRECT = "/auth/login";
export const HOME_PAGE = "/";