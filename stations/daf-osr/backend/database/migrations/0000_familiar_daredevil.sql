-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "plc_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"rack" smallint DEFAULT 0 NOT NULL,
	"slot" smallint DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'DISCONNECTED',
	"enabled" boolean DEFAULT true NOT NULL,
	"protocol" varchar(50) DEFAULT 'SNAP7',
	"last_seen_at" timestamp,
	CONSTRAINT "plc_devices_name_key" UNIQUE("name"),
	CONSTRAINT "plc_devices_ip_address_key" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "plc_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"plc_id" integer NOT NULL,
	"db_number" integer NOT NULL,
	"byte_offset" integer NOT NULL,
	"bit_offset" integer,
	"data_type" varchar(20) NOT NULL,
	"tag_name" varchar(150) NOT NULL,
	"access" varchar(10) DEFAULT 'READ' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"node_id" varchar(255) DEFAULT NULL,
	CONSTRAINT "plc_tags_tag_name_key" UNIQUE("tag_name")
);
--> statement-breakpoint
CREATE TABLE "station_tag_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"station" varchar(50) NOT NULL,
	"equipment" varchar(100) NOT NULL,
	"signal_key" varchar(50) NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "uk_station_mapping" UNIQUE("station","signal_key","equipment"),
	CONSTRAINT "uk_daf_station_mapping" UNIQUE("station","signal_key","equipment")
);
--> statement-breakpoint
CREATE TABLE "threshold_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"parameter_key" varchar(100) NOT NULL,
	"lower_val" double precision DEFAULT 0,
	"warning_val" double precision DEFAULT 50,
	"danger_val" double precision DEFAULT 80,
	"unit" varchar(20) DEFAULT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "threshold_settings_parameter_key_key" UNIQUE("parameter_key")
);
--> statement-breakpoint
CREATE TABLE "station_event_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tag_name" varchar(150) NOT NULL,
	"old_value" varchar(255) DEFAULT NULL,
	"new_value" varchar(255) DEFAULT NULL,
	"quality" varchar(50) DEFAULT 'GOOD',
	"severity" varchar(20) DEFAULT 'INFO',
	"source" varchar(50) DEFAULT 'PLC',
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP(3),
	"shift" varchar(10) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE "logsheet_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift" varchar(10) NOT NULL,
	"log_date" date NOT NULL,
	"operator_id" integer NOT NULL,
	"operator_name" varchar(100) NOT NULL,
	"data_json" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "uk_date_shift" UNIQUE("shift","log_date")
);
--> statement-breakpoint
CREATE TABLE "plc_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag_id" integer NOT NULL,
	"value" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp,
	"error_message" varchar(255) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE "plc_desired_state" (
	"tag_id" integer PRIMARY KEY NOT NULL,
	"desired_value" varchar(255) NOT NULL,
	"is_synced" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "plc_tag_latest" (
	"tag_id" integer PRIMARY KEY NOT NULL,
	"value" varchar(255) NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "plc_tag_values" (
	"tag_id" integer NOT NULL,
	"value" varchar(255) NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "plc_tags" ADD CONSTRAINT "plc_tags_plc_id_fkey" FOREIGN KEY ("plc_id") REFERENCES "public"."plc_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_tag_mappings" ADD CONSTRAINT "station_tag_mappings_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."plc_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plc_commands" ADD CONSTRAINT "plc_commands_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."plc_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plc_desired_state" ADD CONSTRAINT "plc_desired_state_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."plc_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plc_tag_latest" ADD CONSTRAINT "plc_tag_latest_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."plc_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plc_tag_values" ADD CONSTRAINT "plc_tag_values_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."plc_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_plc_tags_enabled" ON "plc_tags" USING btree ("enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_plc_tags_plc" ON "plc_tags" USING btree ("plc_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_stm_station" ON "station_tag_mappings" USING btree ("station" text_ops);--> statement-breakpoint
CREATE INDEX "idx_stm_tag" ON "station_tag_mappings" USING btree ("tag_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_event_severity" ON "station_event_logs" USING btree ("severity" text_ops);--> statement-breakpoint
CREATE INDEX "idx_event_timestamp" ON "station_event_logs" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_plc_commands_created" ON "plc_commands" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_plc_commands_status" ON "plc_commands" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_plc_tag_values_tag_time" ON "plc_tag_values" USING btree ("tag_id" int4_ops,"timestamp" int4_ops);
*/