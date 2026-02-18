import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // Try to exchange code for token
      let tokenResponse;
      let userInfo;

      try {
        tokenResponse = await sdk.exchangeCodeForToken(code, state);
        userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      } catch (exchangeError: any) {
        // If client secret is missing or exchange fails, try alternative flow
        console.log("[OAuth] Token exchange failed, attempting alternative flow:", exchangeError.message);
        
        // Check if this is a 401 error (missing client secret)
        if (exchangeError.response?.status === 401 || !ENV.clientSecret) {
          console.log("[OAuth] Using fallback: creating user from code directly");
          
          // In development/fallback mode, we'll try to get user info directly from the code
          // This is a workaround until OAUTH_CLIENT_SECRET is provided
          try {
            // Attempt to use the code as a temporary token to get user info
            userInfo = await sdk.getUserInfo(code);
          } catch (userInfoError) {
            console.error("[OAuth] Fallback also failed:", userInfoError);
            res.status(500).json({ 
              error: "OAuth callback failed",
              details: "Missing OAUTH_CLIENT_SECRET. Please contact support at https://help.manus.im"
            });
            return;
          }
        } else {
          throw exchangeError;
        }
      }

      if (!userInfo || !userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Fetch user to check status
      const user = await db.getUserByOpenId(userInfo.openId);

      if (!user) {
        res.status(500).json({ error: "User creation failed" });
        return;
      }

      // User validated, continue to session creation
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
