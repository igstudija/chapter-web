import * as migration_20260725_172248 from './20260725_172248';
import * as migration_20260726_052026_slide_media_templates from './20260726_052026_slide_media_templates';
import * as migration_20260726_061813_slide_hide_member_info from './20260726_061813_slide_hide_member_info';
import * as migration_20260726_070831_slideshow_chrome_and_request_slide from './20260726_070831_slideshow_chrome_and_request_slide';
import * as migration_20260727_032845_special_request_display_options from './20260727_032845_special_request_display_options';
import * as migration_20260727_034629_member_hide_special_request from './20260727_034629_member_hide_special_request';
import * as migration_20260727_035434_drop_spotlight_template from './20260727_035434_drop_spotlight_template';
import * as migration_20260727_040906_slide_media_background_colour from './20260727_040906_slide_media_background_colour';
import * as migration_20260727_053943_next_speaker_position from './20260727_053943_next_speaker_position';
import * as migration_20260727_060000_member_slide_overrides from './20260727_060000_member_slide_overrides';
import * as migration_20260727_120000_drop_referrals_and_meetings from './20260727_120000_drop_referrals_and_meetings';

export const migrations = [
  {
    up: migration_20260725_172248.up,
    down: migration_20260725_172248.down,
    name: '20260725_172248',
  },
  {
    up: migration_20260726_052026_slide_media_templates.up,
    down: migration_20260726_052026_slide_media_templates.down,
    name: '20260726_052026_slide_media_templates',
  },
  {
    up: migration_20260726_061813_slide_hide_member_info.up,
    down: migration_20260726_061813_slide_hide_member_info.down,
    name: '20260726_061813_slide_hide_member_info',
  },
  {
    up: migration_20260726_070831_slideshow_chrome_and_request_slide.up,
    down: migration_20260726_070831_slideshow_chrome_and_request_slide.down,
    name: '20260726_070831_slideshow_chrome_and_request_slide',
  },
  {
    up: migration_20260727_032845_special_request_display_options.up,
    down: migration_20260727_032845_special_request_display_options.down,
    name: '20260727_032845_special_request_display_options',
  },
  {
    up: migration_20260727_034629_member_hide_special_request.up,
    down: migration_20260727_034629_member_hide_special_request.down,
    name: '20260727_034629_member_hide_special_request',
  },
  {
    up: migration_20260727_035434_drop_spotlight_template.up,
    down: migration_20260727_035434_drop_spotlight_template.down,
    name: '20260727_035434_drop_spotlight_template',
  },
  {
    up: migration_20260727_040906_slide_media_background_colour.up,
    down: migration_20260727_040906_slide_media_background_colour.down,
    name: '20260727_040906_slide_media_background_colour',
  },
  {
    up: migration_20260727_053943_next_speaker_position.up,
    down: migration_20260727_053943_next_speaker_position.down,
    name: '20260727_053943_next_speaker_position'
  },
  {
    up: migration_20260727_060000_member_slide_overrides.up,
    down: migration_20260727_060000_member_slide_overrides.down,
    name: '20260727_060000_member_slide_overrides',
  },
  {
    up: migration_20260727_120000_drop_referrals_and_meetings.up,
    down: migration_20260727_120000_drop_referrals_and_meetings.down,
    name: '20260727_120000_drop_referrals_and_meetings',
  },
];
