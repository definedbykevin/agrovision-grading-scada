import {
    pgTable,
    unique,
    serial,
    varchar,
    smallint,
    boolean,
    timestamp,
    index,
    foreignKey,
    integer,
    doublePrecision,
    bigserial,
    date,
    jsonb,
    text
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const plcDevices = pgTable("plc_devices", {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    ipAddress: varchar("ip_address", { length: 50 }).notNull(),
    rack: smallint().default(0).notNull(),
    slot: smallint().default(1).notNull(),
    status: varchar({ length: 20 }).default('DISCONNECTED'),
    enabled: boolean().default(true).notNull(),
    protocol: varchar({ length: 50 }).default('SNAP7'),
    stale: boolean().default(false),
    lastSeenAt: timestamp("last_seen_at", { mode: 'string' }),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT
        _TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    unique("plc_devices_name_key").on(table.name),
    unique("plc_devices_ip_address_key").on(table.ipAddress),
]);

export const plcTags = pgTable("plc_tags", {
    id: serial().primaryKey().notNull(),
    plcId: integer("plc_id").notNull(),
    dbNumber: integer("db_number").notNull(),
    byteOffset: integer("byte_offset").notNull(),
    bitOffset: integer("bit_offset"),
    dataType: varchar("data_type", { length: 20 }).default('BOOL').notNull(),
    tagName: varchar("tag_name", { length: 150 }).notNull(),
    access: varchar({ length: 20 }).default('READ').notNull(),
    enabled: boolean().default(true).notNull(),
    nodeId: varchar("node_id", { length: 255 }).default(sql`NULL`),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    index("idx_threshing_plc_tags_enabled").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
    index("idx_threshing_plc_tags_plc").using("btree", table.plcId.asc().nullsLast().op("int4_ops")),
    foreignKey({
        columns: [table.plcId],
        foreignColumns: [plcDevices.id],
        name: "plc_tags_plc_id_fkey"
    }).onDelete("cascade"),
    unique("plc_tags_tag_name_key").on(table.tagName),
]);

export const stationTagMappings = pgTable("station_tag_mappings", {
    id: serial().primaryKey().notNull(),
    station: varchar({ length: 50 }).notNull(),
    equipment: varchar({ length: 100 }).notNull(),
    signalKey: varchar("signal_key", { length: 50 }).notNull(),
    tagId: integer("tag_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    index("idx_threshing_stm_station").using("btree", table.station.asc().nullsLast().op("text_ops")),
    index("idx_threshing_stm_tag").using("btree", table.tagId.asc().nullsLast().op("int4_ops")),
    foreignKey({
        columns: [table.tagId],
        foreignColumns: [plcTags.id],
        name: "station_tag_mappings_tag_id_fkey"
    }).onDelete("cascade"),
    unique("uk_threshing_station_mapping").on(table.station, table.signalKey, table.equipment),
]);

export const thresholdSettings = pgTable("threshold_settings", {
    id: serial().primaryKey().notNull(),
    parameterKey: varchar("parameter_key", { length: 100 }).notNull(),
    lowerVal: doublePrecision("lower_val").default(0),
    warningVal: doublePrecision("warning_val").default(50),
    dangerVal: doublePrecision("danger_val").default(80),
    unit: varchar({ length: 20 }).default(sql`NULL`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    unique("threshold_settings_parameter_key_key").on(table.parameterKey),
]);

export const stationEventLogs = pgTable("station_event_logs", {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    tagName: varchar("tag_name", { length: 150 }).notNull(),
    oldValue: varchar("old_value", { length: 255 }).default(sql`NULL`),
    newValue: varchar("new_value", { length: 255 }).default(sql`NULL`),
    quality: varchar({ length: 50 }).default('GOOD'),
    severity: varchar({ length: 20 }).default('INFO'),
    source: varchar({ length: 50 }).default('PLC'),
    timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP(3)`),
    shift: varchar({ length: 10 }).default(sql`NULL`),
}, (table) => [
    index("idx_threshing_event_severity").using("btree", table.severity.asc().nullsLast().op("text_ops")),
    index("idx_threshing_event_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
]);

export const logsheetEntries = pgTable("logsheet_entries", {
    id: serial().primaryKey().notNull(),
    shift: varchar({ length: 10 }).notNull(),
    logDate: date("log_date").notNull(),
    operatorId: integer("operator_id").notNull(),
    operatorName: varchar("operator_name", { length: 100 }).notNull(),
    dataJson: jsonb("data_json").notNull(),
    notes: text(),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    unique("uk_threshing_date_shift").on(table.shift, table.logDate),
]);

export const plcCommands = pgTable("plc_commands", {
    id: serial().primaryKey().notNull(),
    tagId: integer("tag_id").notNull(),
    value: varchar({ length: 255 }).notNull(),
    status: varchar({ length: 20 }).default('PENDING').notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }),
    errorMessage: varchar("error_message", { length: 255 }).default(sql`NULL`),
}, (table) => [
    index("idx_threshing_plc_commands_created").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
    index("idx_threshing_plc_commands_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.tagId],
        foreignColumns: [plcTags.id],
        name: "plc_commands_tag_id_fkey"
    }).onDelete("cascade"),
]);

export const plcDesiredState = pgTable("plc_desired_state", {
    tagId: integer("tag_id").primaryKey().notNull(),
    desiredValue: varchar("desired_value", { length: 255 }).notNull(),
    isSynced: boolean("is_synced").default(false).notNull(),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.tagId],
        foreignColumns: [plcTags.id],
        name: "plc_desired_state_tag_id_fkey"
    }).onDelete("cascade"),
]);

export const plcTagLatest = pgTable("plc_tag_latest", {
    tagId: integer("tag_id").primaryKey().notNull(),
    value: varchar({ length: 255 }).notNull(),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.tagId],
        foreignColumns: [plcTags.id],
        name: "plc_tag_latest_tag_id_fkey"
    }).onDelete("cascade"),
]);

export const plcTagValues = pgTable("plc_tag_values", {
    tagId: integer("tag_id").notNull(),
    value: varchar({ length: 255 }).notNull(),
    timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    index("idx_threshing_plc_tag_values_tag_time").using("btree", table.tagId.asc().nullsLast().op("int4_ops"), table.timestamp.asc().nullsLast().op("timestamp_ops")),
    foreignKey({
        columns: [table.tagId],
        foreignColumns: [plcTags.id],
        name: "plc_tag_values_tag_id_fkey"
    }).onDelete("cascade"),
]);

export const plcDevicesRelations = relations(plcDevices, ({ many }) => ({
    tags: many(plcTags),
}));

export const plcTagsRelations = relations(plcTags, ({ one, many }) => ({
    device: one(plcDevices, {
        fields: [plcTags.plcId],
        references: [plcDevices.id],
    }),
    mappings: many(stationTagMappings),
    commands: many(plcCommands),
    desiredState: one(plcDesiredState, {
        fields: [plcTags.id],
        references: [plcDesiredState.tagId],
    }),
    latest: one(plcTagLatest, {
        fields: [plcTags.id],
        references: [plcTagLatest.tagId],
    }),
    values: many(plcTagValues),
}));

export const stationTagMappingsRelations = relations(stationTagMappings, ({ one }) => ({
    tag: one(plcTags, {
        fields: [stationTagMappings.tagId],
        references: [plcTags.id],
    }),
}));

export const plcCommandsRelations = relations(plcCommands, ({ one }) => ({
    tag: one(plcTags, {
        fields: [plcCommands.tagId],
        references: [plcTags.id],
    }),
}));

export const plcDesiredStateRelations = relations(plcDesiredState, ({ one }) => ({
    tag: one(plcTags, {
        fields: [plcDesiredState.tagId],
        references: [plcDesiredState.tagId],
    }),
}));

export const plcTagLatestRelations = relations(plcTagLatest, ({ one }) => ({
    tag: one(plcTags, {
        fields: [plcTagLatest.tagId],
        references: [plcTags.id],
    }),
}));

export const plcTagValuesRelations = relations(plcTagValues, ({ one }) => ({
    tag: one(plcTags, {
        fields: [plcTagValues.tagId],
        references: [plcTags.id],
    }),
}));


