CREATE TABLE `merge_analyses` (
	`id` varchar(64) NOT NULL,
	`userId` int,
	`repositoryPath` varchar(1024) NOT NULL,
	`sourceBranch` varchar(255) NOT NULL,
	`targetBranch` varchar(255) NOT NULL,
	`mergeBase` varchar(128) NOT NULL,
	`status` enum('completed','failed') NOT NULL,
	`conflictCount` int NOT NULL DEFAULT 0,
	`summary` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `merge_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merge_conflicts` (
	`id` varchar(64) NOT NULL,
	`analysisId` varchar(64) NOT NULL,
	`filePath` varchar(1024) NOT NULL,
	`classification` enum('syntactic','semantic','mixed') NOT NULL,
	`risk` enum('low','medium','high') NOT NULL,
	`explanation` text NOT NULL,
	`astSummary` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `merge_conflicts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resolution_candidates` (
	`id` varchar(64) NOT NULL,
	`analysisId` varchar(64) NOT NULL,
	`conflictId` varchar(64) NOT NULL,
	`strategy` varchar(96) NOT NULL,
	`label` varchar(255) NOT NULL,
	`score` int NOT NULL,
	`decision` enum('recommended','review','rejected') NOT NULL,
	`scoreExplanation` text NOT NULL,
	`validation` json NOT NULL,
	`patch` text NOT NULL,
	`payload` json NOT NULL,
	`selectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resolution_candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resolution_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` varchar(64) NOT NULL,
	`candidateId` varchar(64),
	`eventType` enum('analysis_created','candidate_selected','patch_exported') NOT NULL,
	`details` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resolution_events_id` PRIMARY KEY(`id`)
);
