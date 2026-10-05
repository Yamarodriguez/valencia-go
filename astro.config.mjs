import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.valenciaandgo.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      lastmod: new Date(),
      // las legales y el acuse del formulario no van al sitemap
      filter: (pagina) =>
        !['/aviso-legal/', '/politica-de-privacidad/', '/politica-de-cookies/',
          '/condiciones-de-compra/', '/gracias/']
          .some((r) => pagina.endsWith(r)),
    }),
  ],
});
