-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.dashboards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dashboards_pkey PRIMARY KEY (id),
  CONSTRAINT dashboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.data_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  source_name text,
  config jsonb,
  CONSTRAINT data_sources_pkey PRIMARY KEY (id),
  CONSTRAINT data_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.documentation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  datasource_id uuid,
  filename text NOT NULL,
  markdown_content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documentation_pkey PRIMARY KEY (id),
  CONSTRAINT documentation_datasource_id_fkey FOREIGN KEY (datasource_id) REFERENCES public.data_sources(id)
);
CREATE TABLE public.user_ai_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  provider text NOT NULL DEFAULT 'anthropic'::text,
  model text NOT NULL DEFAULT 'claude-sonnet-4-20250514'::text,
  has_api_key boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  encrypted_api_key text,
  CONSTRAINT user_ai_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_ai_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);