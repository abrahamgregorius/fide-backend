const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { getSupabaseClient } = require("../lib/supabase");
const { ok, badRequest, unauthorized, serverError } = require("../lib/http");

const router = express.Router();

router.post(
  "/auth/signup",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { email, password } = req.body;

    if (!email || !password) {
      return badRequest(res, "Email and password are required.");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return badRequest(res, error.message);
    }

    if (!data.user) {
      return serverError(res, "User creation failed.");
    }

    return ok(
      res,
      {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresIn: data.session.expires_in,
              expiresAt: data.session.expires_at,
            }
          : null,
        message: "Signup successful. Check your email to confirm.",
      },
      201
    );
  })
);

router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { email, password } = req.body;

    if (!email || !password) {
      return badRequest(res, "Email and password are required.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return unauthorized(res, error.message);
    }

    if (!data.user || !data.session) {
      return serverError(res, "Login failed.");
    }

    return ok(res, {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at,
      },
    });
  })
);

router.post(
  "/auth/refresh",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return badRequest(res, "Refresh token is required.");
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      return unauthorized(res, error.message);
    }

    if (!data.session) {
      return serverError(res, "Token refresh failed.");
    }

    return ok(res, {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at,
      },
    });
  })
);

module.exports = router;
