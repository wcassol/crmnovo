import {
  getServerPublicConfig,
  PUBLIC_CONFIG_GLOBAL,
} from '@/lib/runtime-config';

export function RuntimeConfigScript() {
  const cfg = getServerPublicConfig();
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return (
    <script
      id="public-config"
      dangerouslySetInnerHTML={{
        __html: `window.${PUBLIC_CONFIG_GLOBAL}=${json};`,
      }}
    />
  );
}
