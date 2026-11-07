import type { Response } from "express";
import config from "../config";

const base = {
	httpOnly: true,
	secure: config.node_env === "production",
	sameSite: "lax" as const,
	path:"/"
};

export const ACCESS_COOKIE = "fixflow_access_token";
export const REFRESH_COOKIE = "fixflow_refresh_token";

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
	res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: 24 * 60 * 60 * 1000 });
	res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

export const clearAuthCookies = (res: Response) => {
	res.clearCookie(ACCESS_COOKIE, base);
	res.clearCookie(REFRESH_COOKIE, base);
};