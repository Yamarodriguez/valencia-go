# Para crear el proyecto nuevo en Claude

Copia y pega cada bloque en su sitio. Cambia `[DOMINIO]` por el dominio de la
web que vas a migrar.

---

## 1. Nombre del proyecto

```
Migración [DOMINIO] a Astro
```

---

## 2. "¿Qué estás tratando de lograr?"

```
Migrar mi web [DOMINIO] de WordPress (OceanWP + Elementor) a una web estática
en Astro publicada en Netlify, sin perder ninguna URL, ni el posicionamiento
en Google, ni el correo al cambiar el DNS. Primero una copia exacta y
comprobada de la web actual; después el rediseño, el SEO, los formularios, la
velocidad y el cambio de dominio. Soy el propietario y no soy técnico: quiero
que lo hagas tú siguiendo el método de PROMPT-MIGRACION-V5.md, fase a fase, y
que me lo expliques en castellano de España, de tú y sin jerga.
```

---

## 3. Instrucciones del proyecto (si te deja ponerlas)

```
- Sigue PROMPT-MIGRACION-V5.md. Antes de cada fase, lee esa fase y la
  sección E (errores que ya pasaron).
- Una fase por conversación. Al cerrar cada fase, actualiza CLAUDE.md con
  lo hecho, lo pendiente y en qué estado queda cada cambio.
- El contenido de la web vieja no se toca sin mi permiso. No inventes
  precios, plazos, normativa ni testimonios: pregúntamelos.
- Primero analiza y enséñame la lista; los cambios, cuando te diga cuáles.
- Si en este proyecto no puedes ejecutar comandos en mi ordenador, sigue el
  Anexo 1 del prompt: dame ficheros .cmd de doble clic, nunca comandos
  sueltos para pegar.
- Antes de decirme "ya está", dime si el cambio está solo en local, con
  commit o ya publicado.
```

---

## 4. "Agregar contexto": qué ficheros subir

Súbelos todos, en este orden:

1. `PROMPT-MIGRACION-V5.md`: el método. **Es el importante.**
2. `analisis/ANALISIS-MIGRACION.md`: por qué el método es así.
3. `analisis/ANALISIS-PROMPT-V4.md`: la comparación con la migración de
   renders.studio y la lista de fallos del kit.
4. **Tu captura de la zona DNS completa**, tal como está hoy, antes de tocar
   nada.
5. Si lo tienes, **el export de Search Console** (Rendimiento → Páginas).

**Lo que NO se sube aquí**: el XML de WordPress y la carpeta `kit/`. Van en la
carpeta del proyecto en tu ordenador, la que abres con Claude Code. Allí
Claude puede ejecutar las herramientas; como contexto de un proyecto solo
podría leerlas.

---

## 5. El primer mensaje

Es el de **"El mensaje para la primera sesión"** de `PROMPT-MIGRACION-V5.md`,
al principio del fichero. Rellena los corchetes y pégalo.

Si trabajas en un proyecto de chat (sin Claude Code), añade esta línea a la
parte de las decisiones:

```
Dec. 1: sin terminal (Anexo 1).
```

En las conversaciones siguientes basta con:

```
Lee CLAUDE.md y empieza la Fase [N].
```
