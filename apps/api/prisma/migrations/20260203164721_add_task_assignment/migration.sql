-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('INBOX', 'PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('QUICK', 'DEEP_WORK', 'COURSE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TaskContext" AS ENUM ('PERSONAL', 'WORK', 'LEARNING');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('UP', 'DOWN', 'DEGRADED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "google_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_calendars" (
    "id" SERIAL NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#4285F4',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "treat_all_day_as_schedule" BOOLEAN NOT NULL DEFAULT false,
    "default_start_time" TEXT DEFAULT '09:00',
    "default_end_time" TEXT DEFAULT '17:00',
    "schedule_per_day" JSONB,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'INBOX',
    "type" "TaskType",
    "context" "TaskContext" NOT NULL DEFAULT 'PERSONAL',
    "deadline" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "assigned_date" DATE,
    "assigned_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_briefs" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "full_text" TEXT NOT NULL,
    "weather_summary" TEXT,
    "events_summary" TEXT,
    "tasks_summary" TEXT,
    "news_summary" TEXT,
    "servers_summary" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "url" TEXT,
    "status" "HealthStatus" NOT NULL,
    "response_time" INTEGER,
    "error_message" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_calendars_user_id_calendar_id_key" ON "user_calendars"("user_id", "calendar_id");

-- CreateIndex
CREATE INDEX "calendar_events_user_id_start_time_idx" ON "calendar_events"("user_id", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_user_id_google_event_id_key" ON "calendar_events"("user_id", "google_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_briefs_date_key" ON "daily_briefs"("date");

-- CreateIndex
CREATE INDEX "daily_briefs_user_id_date_idx" ON "daily_briefs"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_briefs_user_id_date_key" ON "daily_briefs"("user_id", "date");

-- CreateIndex
CREATE INDEX "health_checks_user_id_service_name_checked_at_idx" ON "health_checks"("user_id", "service_name", "checked_at");

-- AddForeignKey
ALTER TABLE "user_calendars" ADD CONSTRAINT "user_calendars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_briefs" ADD CONSTRAINT "daily_briefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
