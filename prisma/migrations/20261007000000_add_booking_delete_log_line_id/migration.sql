-- AlterTable: keep the booker's LINE id when an admin deletes a booking
ALTER TABLE `booking_delete_log`
  ADD COLUMN `line_id` VARCHAR(255) NULL AFTER `customer_phone`;
