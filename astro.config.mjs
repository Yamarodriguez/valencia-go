import { defineConfig } from 'astro/config';

// Sin la integracion de sitemap de Astro: los mapas del sitio son los MISMOS de
// la web vieja (sitemap_index.xml y los que enlaza), copiados a public/ por
// scripts/sitemaps.mjs. Google tiene apuntado ese nombre y ahi estan solo las
// paginas que el propietario queria indexadas (las noindex no salen).
export default defineConfig({
  site: 'https://www.valenciaandgo.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
