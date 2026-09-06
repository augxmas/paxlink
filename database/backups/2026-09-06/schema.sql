-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: paxlink
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.24.04.4

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `catacomb_comment_likes`
--

DROP TABLE IF EXISTS `catacomb_comment_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catacomb_comment_likes` (
  `comment_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`,`parishioner_id`),
  KEY `fk_catacomb_like_user` (`parishioner_id`),
  CONSTRAINT `fk_catacomb_like_comment` FOREIGN KEY (`comment_id`) REFERENCES `catacomb_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_catacomb_like_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catacomb_comments`
--

DROP TABLE IF EXISTS `catacomb_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catacomb_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `content` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_catacomb_comment_post` (`post_id`,`created_at`),
  KEY `fk_catacomb_comment_author` (`author_id`),
  CONSTRAINT `fk_catacomb_comment_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_catacomb_comment_post` FOREIGN KEY (`post_id`) REFERENCES `catacomb_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catacomb_posts`
--

DROP TABLE IF EXISTS `catacomb_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catacomb_posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `anonymous` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_catacomb_post_parish` (`parish_id`,`created_at`),
  KEY `fk_catacomb_post_author` (`author_id`),
  CONSTRAINT `fk_catacomb_post_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_catacomb_post_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catacomb_reactions`
--

DROP TABLE IF EXISTS `catacomb_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catacomb_reactions` (
  `post_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `reaction` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`,`parishioner_id`),
  KEY `fk_catacomb_reaction_user` (`parishioner_id`),
  CONSTRAINT `fk_catacomb_reaction_post` FOREIGN KEY (`post_id`) REFERENCES `catacomb_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_catacomb_reaction_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catholic_shrines`
--

DROP TABLE IF EXISTS `catholic_shrines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catholic_shrines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `diocese` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_numbers` json NOT NULL,
  `website_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` json NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `source_order` int unsigned NOT NULL,
  `source_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_updated_date` date DEFAULT NULL,
  `source_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `crawled_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shrine_source_hash` (`source_hash`),
  KEY `idx_shrine_diocese_order` (`diocese`,`source_order`),
  KEY `idx_shrine_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catholic_term_aliases`
--

DROP TABLE IF EXISTS `catholic_term_aliases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catholic_term_aliases` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `term_id` bigint unsigned NOT NULL,
  `alias` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_catholic_term_alias` (`term_id`,`alias`),
  KEY `idx_catholic_alias` (`alias`),
  CONSTRAINT `fk_catholic_alias_term` FOREIGN KEY (`term_id`) REFERENCES `catholic_terms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=501 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catholic_term_categories`
--

DROP TABLE IF EXISTS `catholic_term_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catholic_term_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_catholic_term_category` (`name`),
  KEY `fk_catholic_term_category_parent` (`parent_id`),
  CONSTRAINT `fk_catholic_term_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `catholic_term_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catholic_term_category_links`
--

DROP TABLE IF EXISTS `catholic_term_category_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catholic_term_category_links` (
  `term_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`term_id`,`category_id`),
  KEY `fk_catholic_link_category` (`category_id`),
  CONSTRAINT `fk_catholic_link_category` FOREIGN KEY (`category_id`) REFERENCES `catholic_term_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_catholic_link_term` FOREIGN KEY (`term_id`) REFERENCES `catholic_terms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catholic_terms`
--

DROP TABLE IF EXISTS `catholic_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catholic_terms` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `term` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `normalized_term` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'approved',
  `created_by_parish_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_catholic_term` (`normalized_term`),
  KEY `idx_catholic_term_status` (`review_status`,`term`),
  KEY `fk_catholic_term_parish` (`created_by_parish_id`),
  CONSTRAINT `fk_catholic_term_parish` FOREIGN KEY (`created_by_parish_id`) REFERENCES `parishes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=501 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_account_entries`
--

DROP TABLE IF EXISTS `legion_account_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_account_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `entry_date` date NOT NULL,
  `direction` enum('income','expense') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('member_offering','secret_bag','praesidium_contribution','contribution','event','administration','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_organization_id` bigint unsigned DEFAULT NULL,
  `receipt_name` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_type` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_data` mediumblob,
  `created_by` bigint unsigned NOT NULL,
  `report_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legion_entry` (`organization_id`,`entry_date`),
  KEY `fk_legion_entry_source` (`source_organization_id`),
  KEY `fk_legion_entry_creator` (`created_by`),
  CONSTRAINT `fk_legion_entry_creator` FOREIGN KEY (`created_by`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legion_entry_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_entry_source` FOREIGN KEY (`source_organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_account_reports`
--

DROP TABLE IF EXISTS `legion_account_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_account_reports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `period_from` date NOT NULL,
  `period_to` date NOT NULL,
  `status` enum('requested','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `requested_by` bigint unsigned NOT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_by` bigint unsigned DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_legion_report_period` (`organization_id`,`period_from`,`period_to`),
  KEY `idx_legion_report` (`organization_id`,`status`),
  KEY `fk_legion_report_requester` (`requested_by`),
  KEY `fk_legion_report_decider` (`decided_by`),
  CONSTRAINT `fk_legion_report_decider` FOREIGN KEY (`decided_by`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legion_report_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_report_requester` FOREIGN KEY (`requested_by`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_accounts`
--

DROP TABLE IF EXISTS `legion_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_accounts` (
  `organization_id` bigint unsigned NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL,
  `initialized_by` bigint unsigned NOT NULL,
  `initialized_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`organization_id`),
  KEY `fk_legion_account_person` (`initialized_by`),
  CONSTRAINT `fk_legion_account_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_account_person` FOREIGN KEY (`initialized_by`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_inquiries`
--

DROP TABLE IF EXISTS `legion_inquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_inquiries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `content` varchar(3000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `responder_id` bigint unsigned DEFAULT NULL,
  `response` varchar(3000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_legion_inquiry` (`organization_id`,`created_at`),
  KEY `fk_legion_inquiry_author` (`author_id`),
  KEY `fk_legion_inquiry_responder` (`responder_id`),
  CONSTRAINT `fk_legion_inquiry_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_inquiry_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_inquiry_responder` FOREIGN KEY (`responder_id`) REFERENCES `parishioners` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_members`
--

DROP TABLE IF EXISTS `legion_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `role` enum('president','vice_president','secretary','treasurer','member') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `appointed_by` varchar(254) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_legion_member` (`organization_id`,`parishioner_id`),
  KEY `idx_legion_person` (`parishioner_id`,`ended_at`),
  CONSTRAINT `fk_legion_member_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_member_person` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_membership_applications`
--

DROP TABLE IF EXISTS `legion_membership_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_membership_applications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `applicant_id` bigint unsigned NOT NULL,
  `motivation` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('requested','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_by` bigint unsigned DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_legion_application` (`organization_id`,`applicant_id`),
  KEY `idx_legion_application_status` (`organization_id`,`status`,`requested_at`),
  KEY `fk_legion_application_person` (`applicant_id`),
  KEY `fk_legion_application_decider` (`decided_by`),
  CONSTRAINT `fk_legion_application_decider` FOREIGN KEY (`decided_by`) REFERENCES `parishioners` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_legion_application_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_application_person` FOREIGN KEY (`applicant_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_organization_edit_requests`
--

DROP TABLE IF EXISTS `legion_organization_edit_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_organization_edit_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `requested_by` bigint unsigned NOT NULL,
  `description` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon_type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_data` mediumblob,
  `keep_icon` tinyint(1) NOT NULL DEFAULT '1',
  `vice_president_id` bigint unsigned NOT NULL,
  `secretary_id` bigint unsigned NOT NULL,
  `treasurer_id` bigint unsigned NOT NULL,
  `status` enum('requested','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_legion_edit_request` (`organization_id`,`status`,`requested_at`),
  KEY `fk_legion_edit_requester` (`requested_by`),
  CONSTRAINT `fk_legion_edit_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_edit_requester` FOREIGN KEY (`requested_by`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_organizations`
--

DROP TABLE IF EXISTS `legion_organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_organizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `organization_type` enum('curia','praesidium') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_data` mediumblob,
  `spiritual_director_type` enum('priest','nun') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spiritual_director_id` bigint unsigned DEFAULT NULL,
  `founder_id` bigint unsigned NOT NULL,
  `status` enum('draft','requested','approved','rejected','ended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_legion_name` (`parish_id`,`organization_type`,`name`),
  KEY `idx_legion_parent` (`parent_id`,`status`),
  KEY `fk_legion_founder` (`founder_id`),
  CONSTRAINT `fk_legion_founder` FOREIGN KEY (`founder_id`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legion_parent` FOREIGN KEY (`parent_id`) REFERENCES `legion_organizations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legion_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_post_comments`
--

DROP TABLE IF EXISTS `legion_post_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_post_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `content` varchar(3000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legion_comment` (`post_id`,`created_at`),
  KEY `fk_legion_comment_author` (`author_id`),
  CONSTRAINT `fk_legion_comment_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legion_comment_post` FOREIGN KEY (`post_id`) REFERENCES `legion_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_post_likes`
--

DROP TABLE IF EXISTS `legion_post_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_post_likes` (
  `post_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`,`parishioner_id`),
  KEY `fk_legion_like_person` (`parishioner_id`),
  CONSTRAINT `fk_legion_like_person` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_like_post` FOREIGN KEY (`post_id`) REFERENCES `legion_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_post_reads`
--

DROP TABLE IF EXISTS `legion_post_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_post_reads` (
  `post_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `first_read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`,`parishioner_id`),
  KEY `idx_legion_post_read_person` (`parishioner_id`,`last_read_at`),
  CONSTRAINT `fk_legion_post_read_person` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_post_read_post` FOREIGN KEY (`post_id`) REFERENCES `legion_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_posts`
--

DROP TABLE IF EXISTS `legion_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `post_type` enum('notice','board','story','grace_diary','activity_report') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `edit_password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_name` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_type` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_data` mediumblob,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legion_post` (`organization_id`,`post_type`,`created_at`),
  KEY `fk_legion_post_author` (`author_id`),
  CONSTRAINT `fk_legion_post_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legion_post_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_schedule_attendance`
--

DROP TABLE IF EXISTS `legion_schedule_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_schedule_attendance` (
  `schedule_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `attended_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`schedule_id`,`parishioner_id`),
  KEY `idx_legion_attendance_person` (`parishioner_id`,`attended_at`),
  CONSTRAINT `fk_legion_attendance_person` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_legion_attendance_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `legion_schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legion_schedules`
--

DROP TABLE IF EXISTS `legion_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legion_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `creator_id` bigint unsigned NOT NULL,
  `round_no` int unsigned DEFAULT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(5000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legion_schedule` (`organization_id`,`starts_at`),
  KEY `fk_legion_schedule_creator` (`creator_id`),
  CONSTRAINT `fk_legion_schedule_creator` FOREIGN KEY (`creator_id`) REFERENCES `parishioners` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legion_schedule_org` FOREIGN KEY (`organization_id`) REFERENCES `legion_organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `login_sessions`
--

DROP TABLE IF EXISTS `login_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_key` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parish_id` bigint unsigned DEFAULT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logged_in_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `logged_out_at` datetime DEFAULT NULL,
  `logout_reason` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_login_token` (`token_hash`),
  KEY `idx_login_user` (`user_type`,`user_key`,`logged_out_at`),
  KEY `fk_session_parish` (`parish_id`),
  CONSTRAINT `fk_session_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `memorial_entries`
--

DROP TABLE IF EXISTS `memorial_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `memorial_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `memorial_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `entry_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(3000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_memorial_entry` (`memorial_id`,`created_at`),
  KEY `fk_memorial_entry_author` (`author_id`),
  CONSTRAINT `fk_memorial_entry_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_memorial_entry_memorial` FOREIGN KEY (`memorial_id`) REFERENCES `memorials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `memorial_photos`
--

DROP TABLE IF EXISTS `memorial_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `memorial_photos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `memorial_id` bigint unsigned NOT NULL,
  `image_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_data` mediumblob NOT NULL,
  `display_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_memorial_photo` (`memorial_id`,`display_order`),
  CONSTRAINT `fk_memorial_photo` FOREIGN KEY (`memorial_id`) REFERENCES `memorials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `memorials`
--

DROP TABLE IF EXISTS `memorials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `memorials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `author_id` bigint unsigned NOT NULL,
  `subject_member_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `baptismal_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relation_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relation_detail` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `history_text` text COLLATE utf8mb4_unicode_ci,
  `ordination_text` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `death_date` date NOT NULL,
  `biography` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_memorial_parish_status` (`parish_id`,`status`,`created_at`),
  KEY `fk_memorial_author` (`author_id`),
  CONSTRAINT `fk_memorial_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_memorial_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_administrative_guide_content`
--

DROP TABLE IF EXISTS `parish_administrative_guide_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_administrative_guide_content` (
  `parish_id` bigint unsigned NOT NULL,
  `content_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parish_id`),
  CONSTRAINT `fk_administrative_guide_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_admins`
--

DROP TABLE IF EXISTS `parish_admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_admins` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parish_admin` (`parish_id`,`email`),
  CONSTRAINT `fk_admin_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_group_content_comments`
--

DROP TABLE IF EXISTS `parish_group_content_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_group_content_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `content_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `content` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_content_comment` (`content_id`,`created_at`),
  KEY `fk_group_content_comment_author` (`author_id`),
  CONSTRAINT `fk_group_content_comment_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_content_comment_content` FOREIGN KEY (`content_id`) REFERENCES `parish_group_contents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_group_content_reactions`
--

DROP TABLE IF EXISTS `parish_group_content_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_group_content_reactions` (
  `content_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `reaction` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`content_id`,`parishioner_id`),
  KEY `fk_group_content_reaction_member` (`parishioner_id`),
  CONSTRAINT `fk_group_content_reaction_content` FOREIGN KEY (`content_id`) REFERENCES `parish_group_contents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_content_reaction_member` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_group_contents`
--

DROP TABLE IF EXISTS `parish_group_contents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_group_contents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_id` bigint unsigned NOT NULL,
  `author_parishioner_id` bigint unsigned DEFAULT NULL,
  `author_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_data` mediumblob,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_content` (`group_id`,`content_type`,`created_at`),
  KEY `fk_group_content_author` (`author_parishioner_id`),
  CONSTRAINT `fk_group_content_author` FOREIGN KEY (`author_parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_content_group` FOREIGN KEY (`group_id`) REFERENCES `parish_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_group_members`
--

DROP TABLE IF EXISTS `parish_group_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_group_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `joined_at` datetime DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `application_message` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `withdrawal_requested_at` datetime DEFAULT NULL,
  `withdrawal_request_reason` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `withdrawal_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `notification_read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_member` (`group_id`,`parishioner_id`),
  KEY `idx_group_member_parishioner` (`parishioner_id`),
  CONSTRAINT `fk_group_member_group` FOREIGN KEY (`group_id`) REFERENCES `parish_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_member_parishioner` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_groups`
--

DROP TABLE IF EXISTS `parish_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `icon_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_data` mediumblob,
  `name_ko` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `regular_meeting` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creator_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creator_parishioner_id` bigint unsigned DEFAULT NULL,
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_parish_status` (`parish_id`,`status`,`created_at`),
  KEY `fk_group_creator` (`creator_parishioner_id`),
  CONSTRAINT `fk_group_creator` FOREIGN KEY (`creator_parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_group_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_history`
--

DROP TABLE IF EXISTS `parish_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `event_year` smallint unsigned NOT NULL,
  `event_month` tinyint unsigned NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_history_parish_date` (`parish_id`,`event_year`,`event_month`),
  CONSTRAINT `fk_history_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_history_preferences`
--

DROP TABLE IF EXISTS `parish_history_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_history_preferences` (
  `parish_id` bigint unsigned NOT NULL,
  `sort_direction` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'desc',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parish_id`),
  CONSTRAINT `fk_history_preference_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_location_guides`
--

DROP TABLE IF EXISTS `parish_location_guides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_location_guides` (
  `parish_id` bigint unsigned NOT NULL,
  `transport_guides` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parish_id`),
  CONSTRAINT `fk_location_guide_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_login_codes`
--

DROP TABLE IF EXISTS `parish_login_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_login_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_lookup` (`parish_id`,`email`,`created_at`),
  CONSTRAINT `fk_code_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_notices`
--

DROP TABLE IF EXISTS `parish_notices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_notices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `pinned` tinyint(1) NOT NULL DEFAULT '0',
  `popup_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `popup_from` date DEFAULT NULL,
  `popup_to` date DEFAULT NULL,
  `attachment1_name` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment1_type` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment1_data` mediumblob,
  `attachment2_name` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment2_type` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment2_data` mediumblob,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notice_parish_order` (`parish_id`,`pinned`,`created_at`),
  CONSTRAINT `fk_notice_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_notifications`
--

DROP TABLE IF EXISTS `parish_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parish_notification` (`parish_id`,`read_at`,`created_at`),
  CONSTRAINT `fk_admin_notification_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_nun_field_settings`
--

DROP TABLE IF EXISTS `parish_nun_field_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_nun_field_settings` (
  `parish_id` bigint unsigned NOT NULL,
  `field_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `required_field` tinyint(1) NOT NULL DEFAULT '0',
  `searchable` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `display_order` int unsigned NOT NULL DEFAULT '0',
  `alignment` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'left',
  `frozen` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`parish_id`,`field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_nun_setting_revisions`
--

DROP TABLE IF EXISTS `parish_nun_setting_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_nun_setting_revisions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `revision_no` int unsigned NOT NULL,
  `settings_json` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_priest_revision` (`parish_id`,`revision_no`),
  KEY `idx_priest_revision_active` (`parish_id`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_nuns`
--

DROP TABLE IF EXISTS `parish_nuns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_nuns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `baptismal_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `appointment_date` date DEFAULT NULL,
  `affiliation` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generation` int unsigned DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `mobile` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'incoming',
  `incoming_date` date NOT NULL,
  `outgoing_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_priest_parish` (`parish_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_pastoral_goals`
--

DROP TABLE IF EXISTS `parish_pastoral_goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_pastoral_goals` (
  `parish_id` bigint unsigned NOT NULL,
  `year` smallint unsigned NOT NULL,
  `content` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parish_id`,`year`),
  CONSTRAINT `fk_pastoral_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_patron_saint_content`
--

DROP TABLE IF EXISTS `parish_patron_saint_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_patron_saint_content` (
  `parish_id` bigint unsigned NOT NULL,
  `content_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parish_id`),
  CONSTRAINT `fk_patron_saint_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_priest_field_settings`
--

DROP TABLE IF EXISTS `parish_priest_field_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_priest_field_settings` (
  `parish_id` bigint unsigned NOT NULL,
  `field_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `required_field` tinyint(1) NOT NULL DEFAULT '0',
  `searchable` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `display_order` int unsigned NOT NULL DEFAULT '0',
  `alignment` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'left',
  `frozen` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`parish_id`,`field_key`),
  CONSTRAINT `fk_priest_setting_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_priest_setting_revisions`
--

DROP TABLE IF EXISTS `parish_priest_setting_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_priest_setting_revisions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `revision_no` int unsigned NOT NULL,
  `settings_json` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_priest_revision` (`parish_id`,`revision_no`),
  KEY `idx_priest_revision_active` (`parish_id`,`is_active`),
  CONSTRAINT `fk_priest_revision_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_priests`
--

DROP TABLE IF EXISTS `parish_priests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_priests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `baptismal_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `appointment_date` date DEFAULT NULL,
  `affiliation` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generation` int unsigned DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `mobile` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'incoming',
  `incoming_date` date NOT NULL,
  `outgoing_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_priest_parish` (`parish_id`,`status`),
  CONSTRAINT `fk_priest_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_registration_codes`
--

DROP TABLE IF EXISTS `parish_registration_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_registration_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `manager_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_registration_lookup` (`email`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_schedules`
--

DROP TABLE IF EXISTS `parish_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `schedule_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `category` enum('mass','sacrament','devotion','liturgical','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `schedule_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mass_order` json DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` varchar(5000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_name` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_type` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_data` mediumblob,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parish_schedule_source` (`parish_id`,`source_key`),
  KEY `idx_parish_schedule` (`parish_id`,`schedule_date`,`start_time`),
  CONSTRAINT `fk_schedule_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_suggestion_comments`
--

DROP TABLE IF EXISTS `parish_suggestion_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_suggestion_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `suggestion_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `content` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_suggestion_comment` (`suggestion_id`,`created_at`),
  KEY `fk_suggestion_comment_user` (`author_id`),
  CONSTRAINT `fk_suggestion_comment_post` FOREIGN KEY (`suggestion_id`) REFERENCES `parish_suggestions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_suggestion_comment_user` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_suggestion_reactions`
--

DROP TABLE IF EXISTS `parish_suggestion_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_suggestion_reactions` (
  `suggestion_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `reaction` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`suggestion_id`,`parishioner_id`),
  KEY `fk_suggestion_reaction_user` (`parishioner_id`),
  CONSTRAINT `fk_suggestion_reaction_post` FOREIGN KEY (`suggestion_id`) REFERENCES `parish_suggestions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_suggestion_reaction_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_suggestions`
--

DROP TABLE IF EXISTS `parish_suggestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_suggestions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `anonymous` tinyint(1) NOT NULL DEFAULT '0',
  `icon_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_data` mediumblob,
  `attachment_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_data` mediumblob,
  `status` enum('requested','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `read_at` datetime DEFAULT NULL,
  `decision_explanation` varchar(4000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_content` varchar(10000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_suggestion_parish` (`parish_id`,`status`,`created_at`),
  KEY `fk_suggestion_author` (`author_id`),
  CONSTRAINT `fk_suggestion_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_suggestion_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_videos`
--

DROP TABLE IF EXISTS `parish_videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_videos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `youtube_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `video_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_name` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_url` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parish_video` (`parish_id`,`video_id`),
  KEY `idx_parish_video_created` (`parish_id`,`created_at`),
  CONSTRAINT `fk_video_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parishes`
--

DROP TABLE IF EXISTS `parishes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parishes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `diocese` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `parish_code` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_detail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jurisdiction` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office_phone` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fax` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `homepage` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_data` mediumblob,
  `approval_requested_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `approval_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `cancellation_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modified_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parishes_name_diocese` (`name`,`diocese`),
  UNIQUE KEY `uk_parish_code` (`parish_code`),
  KEY `idx_parishes_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parishioner_grace_diaries`
--

DROP TABLE IF EXISTS `parishioner_grace_diaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parishioner_grace_diaries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parishioner_id` bigint unsigned NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` enum('direct','mass') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'direct',
  `source_date` date DEFAULT NULL,
  `source_schedule_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_grace_diary_mass` (`parishioner_id`,`source_schedule_id`),
  KEY `idx_grace_diary_owner` (`parishioner_id`,`created_at`),
  CONSTRAINT `fk_grace_diary_owner` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parishioner_login_codes`
--

DROP TABLE IF EXISTS `parishioner_login_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parishioner_login_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parishioner_login` (`parish_id`,`email`,`created_at`),
  CONSTRAINT `fk_parishioner_login_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parishioner_notifications`
--

DROP TABLE IF EXISTS `parishioner_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parishioner_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parishioner_notification` (`parishioner_id`,`read_at`,`created_at`),
  KEY `fk_notification_parish` (`parish_id`),
  CONSTRAINT `fk_notification_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_parishioner` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parishioner_registration_codes`
--

DROP TABLE IF EXISTS `parishioner_registration_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parishioner_registration_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `verified_at` datetime DEFAULT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parishioner_registration` (`parish_id`,`email`,`created_at`),
  CONSTRAINT `fk_parishioner_registration_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parishioner_schedule_saves`
--

DROP TABLE IF EXISTS `parishioner_schedule_saves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parishioner_schedule_saves` (
  `parishioner_id` bigint unsigned NOT NULL,
  `schedule_id` bigint unsigned NOT NULL,
  `saved_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reminded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`parishioner_id`,`schedule_id`),
  KEY `idx_schedule_reminder` (`reminded_at`,`schedule_id`),
  KEY `fk_schedule_save_schedule` (`schedule_id`),
  CONSTRAINT `fk_schedule_save_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `parish_schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_schedule_save_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parishioners`
--

DROP TABLE IF EXISTS `parishioners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parishioners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `name` varbinary(128) NOT NULL,
  `baptismal_name` varbinary(128) DEFAULT NULL,
  `email` varbinary(272) NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date` varbinary(32) NOT NULL,
  `gender` varbinary(32) DEFAULT NULL,
  `phone` varbinary(32) NOT NULL,
  `mobile` varbinary(32) NOT NULL,
  `postal_code` varbinary(32) NOT NULL,
  `address` varbinary(528) NOT NULL,
  `address_detail` varbinary(320) DEFAULT NULL,
  `terms_agreed_at` datetime NOT NULL,
  `privacy_agreed_at` datetime NOT NULL,
  `push_opt_in` tinyint(1) NOT NULL DEFAULT '0',
  `email_opt_in` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parishioner_email` (`parish_id`,`email`),
  KEY `idx_parishioner_parish_name` (`parish_id`,`name`),
  CONSTRAINT `fk_parishioner_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `parishioners_decrypted`
--

DROP TABLE IF EXISTS `parishioners_decrypted`;
/*!50001 DROP VIEW IF EXISTS `parishioners_decrypted`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `parishioners_decrypted` AS SELECT 
 1 AS `id`,
 1 AS `parish_id`,
 1 AS `name`,
 1 AS `baptismal_name`,
 1 AS `email`,
 1 AS `password_hash`,
 1 AS `birth_date`,
 1 AS `gender`,
 1 AS `phone`,
 1 AS `mobile`,
 1 AS `postal_code`,
 1 AS `address`,
 1 AS `address_detail`,
 1 AS `terms_agreed_at`,
 1 AS `privacy_agreed_at`,
 1 AS `push_opt_in`,
 1 AS `email_opt_in`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `prayer_dream_comments`
--

DROP TABLE IF EXISTS `prayer_dream_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prayer_dream_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `prayer_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `content` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_prayer_comment_prayer` (`prayer_id`),
  KEY `fk_prayer_comment_author` (`author_id`),
  CONSTRAINT `fk_prayer_comment_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prayer_comment_prayer` FOREIGN KEY (`prayer_id`) REFERENCES `prayer_dreams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prayer_dream_reactions`
--

DROP TABLE IF EXISTS `prayer_dream_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prayer_dream_reactions` (
  `prayer_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `reaction` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`prayer_id`,`parishioner_id`),
  KEY `fk_prayer_reaction_user` (`parishioner_id`),
  CONSTRAINT `fk_prayer_reaction_prayer` FOREIGN KEY (`prayer_id`) REFERENCES `prayer_dreams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prayer_reaction_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prayer_dream_recipients`
--

DROP TABLE IF EXISTS `prayer_dream_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prayer_dream_recipients` (
  `prayer_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`prayer_id`,`parishioner_id`),
  KEY `fk_prayer_extra_recipient_user` (`parishioner_id`),
  CONSTRAINT `fk_prayer_extra_recipient_prayer` FOREIGN KEY (`prayer_id`) REFERENCES `prayer_dreams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prayer_extra_recipient_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prayer_dream_viewers`
--

DROP TABLE IF EXISTS `prayer_dream_viewers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prayer_dream_viewers` (
  `prayer_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`prayer_id`,`parishioner_id`),
  KEY `fk_prayer_viewer_user` (`parishioner_id`),
  CONSTRAINT `fk_prayer_viewer_prayer` FOREIGN KEY (`prayer_id`) REFERENCES `prayer_dreams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prayer_viewer_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prayer_dreams`
--

DROP TABLE IF EXISTS `prayer_dreams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prayer_dreams` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `sender_id` bigint unsigned NOT NULL,
  `recipient_id` bigint unsigned NOT NULL,
  `target_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'parishioner',
  `target_ref_id` bigint unsigned DEFAULT NULL,
  `target_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_baptismal_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prayer_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prayer_recipient` (`recipient_id`,`created_at`),
  KEY `idx_prayer_sender` (`sender_id`,`created_at`),
  KEY `fk_prayer_parish` (`parish_id`),
  CONSTRAINT `fk_prayer_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prayer_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prayer_sender` FOREIGN KEY (`sender_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sharing_mission_activity_logs`
--

DROP TABLE IF EXISTS `sharing_mission_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sharing_mission_activity_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mission_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `activity_date` date NOT NULL,
  `time_from` time NOT NULL,
  `time_to` time NOT NULL,
  `content` varchar(5000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mission_activity` (`mission_id`,`activity_date`),
  KEY `fk_mission_activity_author` (`author_id`),
  CONSTRAINT `fk_mission_activity_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mission_activity_mission` FOREIGN KEY (`mission_id`) REFERENCES `sharing_missions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sharing_mission_applications`
--

DROP TABLE IF EXISTS `sharing_mission_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sharing_mission_applications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mission_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `message` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mission_application` (`mission_id`,`parishioner_id`),
  KEY `fk_mission_application_user` (`parishioner_id`),
  CONSTRAINT `fk_mission_application_mission` FOREIGN KEY (`mission_id`) REFERENCES `sharing_missions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mission_application_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sharing_mission_edit_requests`
--

DROP TABLE IF EXISTS `sharing_mission_edit_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sharing_mission_edit_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mission_id` bigint unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `application_from` date NOT NULL,
  `application_to` date NOT NULL,
  `icon_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_data` mediumblob,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mission_edit_request` (`mission_id`),
  CONSTRAINT `fk_mission_edit_request_mission` FOREIGN KEY (`mission_id`) REFERENCES `sharing_missions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sharing_mission_qa_reactions`
--

DROP TABLE IF EXISTS `sharing_mission_qa_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sharing_mission_qa_reactions` (
  `question_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `target` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reaction` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`,`parishioner_id`,`target`),
  KEY `fk_mission_qa_reaction_user` (`parishioner_id`),
  CONSTRAINT `fk_mission_qa_reaction_question` FOREIGN KEY (`question_id`) REFERENCES `sharing_mission_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mission_qa_reaction_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sharing_mission_questions`
--

DROP TABLE IF EXISTS `sharing_mission_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sharing_mission_questions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mission_id` bigint unsigned NOT NULL,
  `asker_id` bigint unsigned NOT NULL,
  `question` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `anonymous` tinyint(1) NOT NULL DEFAULT '0',
  `answer` varchar(5000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mission_question` (`mission_id`,`created_at`),
  KEY `fk_mission_question_asker` (`asker_id`),
  CONSTRAINT `fk_mission_question_asker` FOREIGN KEY (`asker_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mission_question_mission` FOREIGN KEY (`mission_id`) REFERENCES `sharing_missions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sharing_mission_reactions`
--

DROP TABLE IF EXISTS `sharing_mission_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sharing_mission_reactions` (
  `mission_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `reaction` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`mission_id`,`parishioner_id`),
  KEY `fk_mission_reaction_user` (`parishioner_id`),
  CONSTRAINT `fk_mission_reaction_mission` FOREIGN KEY (`mission_id`) REFERENCES `sharing_missions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mission_reaction_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sharing_missions`
--

DROP TABLE IF EXISTS `sharing_missions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sharing_missions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parish_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned DEFAULT NULL,
  `author_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'parishioner',
  `author_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `anonymous` tinyint(1) NOT NULL DEFAULT '0',
  `icon_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_data` mediumblob,
  `application_from` date DEFAULT NULL,
  `application_to` date DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mission_parish_status` (`parish_id`,`status`,`created_at`),
  KEY `fk_mission_author` (`author_id`),
  CONSTRAINT `fk_mission_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mission_parish` FOREIGN KEY (`parish_id`) REFERENCES `parishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shrine_pilgrim_visits`
--

DROP TABLE IF EXISTS `shrine_pilgrim_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shrine_pilgrim_visits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shrine_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `visited_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shrine_pilgrim_visit` (`shrine_id`,`parishioner_id`),
  KEY `idx_shrine_visit_date` (`shrine_id`,`visited_at`),
  KEY `fk_shrine_visit_parishioner` (`parishioner_id`),
  CONSTRAINT `fk_shrine_visit_parishioner` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shrine_visit_shrine` FOREIGN KEY (`shrine_id`) REFERENCES `catholic_shrines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shrine_review_comments`
--

DROP TABLE IF EXISTS `shrine_review_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shrine_review_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `review_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `content` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shrine_review_comment` (`review_id`,`created_at`),
  KEY `fk_shrine_review_comment_author` (`author_id`),
  CONSTRAINT `fk_shrine_review_comment_author` FOREIGN KEY (`author_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shrine_review_comment_review` FOREIGN KEY (`review_id`) REFERENCES `shrine_visit_photos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shrine_review_reactions`
--

DROP TABLE IF EXISTS `shrine_review_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shrine_review_reactions` (
  `review_id` bigint unsigned NOT NULL,
  `parishioner_id` bigint unsigned NOT NULL,
  `reaction` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`,`parishioner_id`),
  KEY `fk_shrine_review_reaction_user` (`parishioner_id`),
  CONSTRAINT `fk_shrine_review_reaction_review` FOREIGN KEY (`review_id`) REFERENCES `shrine_visit_photos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shrine_review_reaction_user` FOREIGN KEY (`parishioner_id`) REFERENCES `parishioners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shrine_visit_photos`
--

DROP TABLE IF EXISTS `shrine_visit_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shrine_visit_photos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `visit_id` bigint unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `review_text` text COLLATE utf8mb4_unicode_ci,
  `review_group_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `tags` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_data` longblob NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shrine_visit_photo` (`visit_id`,`created_at`),
  CONSTRAINT `fk_shrine_visit_photo_visit` FOREIGN KEY (`visit_id`) REFERENCES `shrine_pilgrim_visits` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supervisor_login_codes`
--

DROP TABLE IF EXISTS `supervisor_login_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supervisor_login_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supervisor_login_lookup` (`email`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'paxlink'
--

--
-- Dumping routines for database 'paxlink'
--
/*!50003 DROP FUNCTION IF EXISTS `pax_decrypt` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `pax_decrypt`(value LONGBLOB) RETURNS longtext CHARSET utf8mb4
    NO SQL
    DETERMINISTIC
    SQL SECURITY INVOKER
RETURN IF(value IS NULL, NULL, CONVERT(AES_DECRYPT(value, @paxlink_personal_data_key) USING utf8mb4)) ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `pax_encrypt` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `pax_encrypt`(value LONGTEXT) RETURNS longblob
    NO SQL
    DETERMINISTIC
    SQL SECURITY INVOKER
RETURN IF(value IS NULL, NULL, AES_ENCRYPT(value, @paxlink_personal_data_key)) ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `parishioners_decrypted`
--

/*!50001 DROP VIEW IF EXISTS `parishioners_decrypted`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `parishioners_decrypted` AS select `parishioners`.`id` AS `id`,`parishioners`.`parish_id` AS `parish_id`,(`pax_decrypt`(`parishioners`.`name`) collate utf8mb4_unicode_ci) AS `name`,(`pax_decrypt`(`parishioners`.`baptismal_name`) collate utf8mb4_unicode_ci) AS `baptismal_name`,(`pax_decrypt`(`parishioners`.`email`) collate utf8mb4_unicode_ci) AS `email`,`parishioners`.`password_hash` AS `password_hash`,(`pax_decrypt`(`parishioners`.`birth_date`) collate utf8mb4_unicode_ci) AS `birth_date`,(`pax_decrypt`(`parishioners`.`gender`) collate utf8mb4_unicode_ci) AS `gender`,(`pax_decrypt`(`parishioners`.`phone`) collate utf8mb4_unicode_ci) AS `phone`,(`pax_decrypt`(`parishioners`.`mobile`) collate utf8mb4_unicode_ci) AS `mobile`,(`pax_decrypt`(`parishioners`.`postal_code`) collate utf8mb4_unicode_ci) AS `postal_code`,(`pax_decrypt`(`parishioners`.`address`) collate utf8mb4_unicode_ci) AS `address`,(`pax_decrypt`(`parishioners`.`address_detail`) collate utf8mb4_unicode_ci) AS `address_detail`,`parishioners`.`terms_agreed_at` AS `terms_agreed_at`,`parishioners`.`privacy_agreed_at` AS `privacy_agreed_at`,`parishioners`.`push_opt_in` AS `push_opt_in`,`parishioners`.`email_opt_in` AS `email_opt_in`,`parishioners`.`created_at` AS `created_at`,`parishioners`.`updated_at` AS `updated_at` from `parishioners` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
