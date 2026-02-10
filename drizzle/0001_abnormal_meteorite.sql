CREATE TABLE `chapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`motoClubId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(255),
	`foundingDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `membershipRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`motoClubId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`requestMessage` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `motoClubs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`foundingDate` timestamp,
	`logoUrl` text,
	`description` text,
	`country` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `motoClubs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `motorcycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`licensePlate` varchar(50) NOT NULL,
	`brand` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`photoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `motorcycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passportCheckIns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`locationName` varchar(500) NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`address` text,
	`notes` text,
	`checkInDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passportCheckIns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','club_admin','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `profilePhotoUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `fullName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `roadName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `documentNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `motoClubId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `membershipStatus` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `termsAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `termsAcceptedIp` varchar(45);--> statement-breakpoint
ALTER TABLE `users` ADD `termsVersion` varchar(20);