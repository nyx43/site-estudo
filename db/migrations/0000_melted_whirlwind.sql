CREATE TABLE `Module` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`orderIndex` integer NOT NULL,
	`project` text NOT NULL,
	`subjectId` text NOT NULL,
	FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Module_subjectId_slug_key` ON `Module` (`subjectId`,`slug`);--> statement-breakpoint
CREATE INDEX `Module_subjectId_orderIndex_idx` ON `Module` (`subjectId`,`orderIndex`);--> statement-breakpoint
CREATE TABLE `Subject` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`accent` text NOT NULL,
	`orderIndex` integer NOT NULL,
	`version` integer NOT NULL,
	`learningOutcomes` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Subject_slug_unique` ON `Subject` (`slug`);--> statement-breakpoint
CREATE TABLE `Topic` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`orderIndex` integer NOT NULL,
	`moduleId` text NOT NULL,
	`plan` text NOT NULL,
	FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Topic_moduleId_slug_key` ON `Topic` (`moduleId`,`slug`);--> statement-breakpoint
CREATE INDEX `Topic_moduleId_orderIndex_idx` ON `Topic` (`moduleId`,`orderIndex`);