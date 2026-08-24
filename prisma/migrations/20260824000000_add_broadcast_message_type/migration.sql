-- AlterTable: broadcasts can now carry an image, plain text, or a YouTube link
ALTER TABLE `broadcast_send_log`
  ADD COLUMN `message_type` VARCHAR(20) NOT NULL DEFAULT 'image',
  ADD COLUMN `message_text` TEXT NULL,
  ADD COLUMN `video_url` VARCHAR(500) NULL,
  MODIFY COLUMN `image_path` VARCHAR(500) NULL;
