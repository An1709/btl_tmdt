import 'dotenv/config';
import dns from 'node:dns';

const DEFAULT_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

const configuredDnsServers = String(process.env.DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

dns.setServers(configuredDnsServers.length > 0 ? configuredDnsServers : DEFAULT_DNS_SERVERS);
