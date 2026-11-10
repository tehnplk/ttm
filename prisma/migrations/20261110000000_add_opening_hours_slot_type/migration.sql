-- AlterTable: mark each opening-hours slot as regular (ในเวลา) or overtime (นอกเวลา)
ALTER TABLE `opening_hours`
  ADD COLUMN `slot_type` VARCHAR(20) NOT NULL DEFAULT 'regular' AFTER `end_time`;

-- Keep the evening rounds that were overtime by fixed time before this column existed
UPDATE `opening_hours` SET `slot_type` = 'overtime' WHERE `start_time` IN ('17:00', '18:30');
