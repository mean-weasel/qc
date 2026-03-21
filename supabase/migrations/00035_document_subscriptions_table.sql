-- Document that subscriptions is admin-write-only (managed by Stripe webhooks).
-- No INSERT/UPDATE/DELETE policies = only service_role can write.
COMMENT ON TABLE public.subscriptions IS 'Managed by admin client (Stripe webhooks). No user-level write policies by design.';
