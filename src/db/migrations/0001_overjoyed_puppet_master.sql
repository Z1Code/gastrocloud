CREATE TYPE "public"."delivery_platform" AS ENUM('uber_eats', 'rappi', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_session_state" AS ENUM('greeting', 'browsing_menu', 'adding_items', 'checkout', 'confirmed', 'tracking');--> statement-breakpoint
CREATE TABLE "delivery_platform_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"platform" "delivery_platform" NOT NULL,
	"credentials" text NOT NULL,
	"external_store_id" text,
	"webhook_secret" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_sandbox" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"customer_phone" text NOT NULL,
	"state" "whatsapp_session_state" DEFAULT 'greeting' NOT NULL,
	"cart_data" jsonb,
	"customer_name" text,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_platform_configs" ADD CONSTRAINT "delivery_platform_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_platform_configs_org_platform_idx" ON "delivery_platform_configs" USING btree ("organization_id","platform");--> statement-breakpoint
CREATE INDEX "delivery_platform_configs_org_idx" ON "delivery_platform_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "whatsapp_sessions_restaurant_phone_idx" ON "whatsapp_sessions" USING btree ("restaurant_id","customer_phone");--> statement-breakpoint
CREATE INDEX "whatsapp_sessions_last_message_idx" ON "whatsapp_sessions" USING btree ("last_message_at");