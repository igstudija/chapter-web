import * as migration_20260725_042905_initial from './20260725_042905_initial';

export const migrations = [
  {
    up: migration_20260725_042905_initial.up,
    down: migration_20260725_042905_initial.down,
    name: '20260725_042905_initial'
  },
];
