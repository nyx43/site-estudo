CREATE TABLE `Attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`exerciseId` text NOT NULL,
	`createdAt` text NOT NULL,
	`closedAt` text,
	`isCorrect` integer DEFAULT false NOT NULL,
	`gaveUp` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`exerciseId`) REFERENCES `Exercise`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Attempt_one_open` ON `Attempt` (`exerciseId`) WHERE "Attempt"."closedAt" IS NULL;--> statement-breakpoint
CREATE INDEX `Attempt_exercise_created` ON `Attempt` (`exerciseId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `Exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`lessonId` text NOT NULL,
	`orderIndex` integer NOT NULL,
	`definition` text NOT NULL,
	FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `Exercise_lesson_order` ON `Exercise` (`lessonId`,`orderIndex`);--> statement-breakpoint
CREATE TABLE `LessonProgress` (
	`lessonId` text PRIMARY KEY NOT NULL,
	`progress` text NOT NULL,
	FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`topicId` text NOT NULL,
	`version` integer NOT NULL,
	`definition` text NOT NULL,
	FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Lesson_topic_version` ON `Lesson` (`topicId`,`version`);--> statement-breakpoint
CREATE TABLE `Submission` (
	`requestId` text PRIMARY KEY NOT NULL,
	`attemptId` text NOT NULL,
	`answer` text NOT NULL,
	`isCorrect` integer NOT NULL,
	`feedback` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `Submission_attempt_created` ON `Submission` (`attemptId`,`createdAt`);