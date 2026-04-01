import { HermesProvider } from '@/lib/providers/hermes-provider';
import { OpenClawProvider } from '@/lib/providers/openclaw-provider';
import { DASHBOARD_PROVIDER } from '@/lib/providers/provider-config';
import type { DashboardProvider } from '@/lib/providers/types';

let provider: DashboardProvider | null = null;

export function getProvider(): DashboardProvider {
  if (provider) return provider;
  provider = DASHBOARD_PROVIDER === 'openclaw' ? new OpenClawProvider() : new HermesProvider();
  return provider;
}
