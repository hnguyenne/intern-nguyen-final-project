import { createClient } from '@clickhouse/client';

export const clickhouseClient = createClient({
  url: 'http://localhost:8123',
  username: 'nguyen',
  password: 'nguyen',
  database: 'volta_analytics'
});