[README.md](https://github.com/user-attachments/files/28724707/README.md)
# Portal Digital Institucional

Réplica funcional e independiente del portal analizado. No utiliza cuentas,
credenciales ni bases de datos del repositorio de referencia.

## Probar localmente

Abra `index.html` desde un servidor web local. Al entrar por primera vez, el
portal solicita crear el administrador inicial con nombre, correo y contraseña.

El modo actual es `local`: toda la información se guarda en el navegador del
equipo. Sirve para revisar y aprobar la aplicación, pero no para producción.

## Funciones incluidas

- Configuración inicial y acceso con contraseña.
- Administración de usuarios y permisos por módulo.
- Panel de unidades y módulos.
- Seguimiento de instituciones y etapas de digitalización.
- Levantamientos de estado y fichas técnicas.
- Eventos, enlace público, QR, asistencia y exportación CSV.
- Calendario, documentos y repositorio.
- Exportación JSON, impresión/PDF mediante el navegador.

## Pasar a producción

1. Crear un proyecto de Supabase en una cuenta de la organización.
2. Ejecutar `supabase/schema.sql` en el SQL Editor.
3. Crear el usuario administrador en Authentication.
4. Proporcionar la URL del proyecto y la clave pública `anon` para conectar el
   adaptador de datos y autenticación.
5. Probar políticas, permisos, invitaciones y recuperación de contraseña.
6. Publicar la carpeta en GitHub Pages, Netlify, Vercel o un servidor propio.

`config.js` permanece en modo `local` hasta completar esa conexión. Cambiar el
texto a `supabase` por sí solo no migra los datos.

La clave `service_role` de Supabase nunca debe ponerse en `config.js` ni en el
repositorio. Las invitaciones de usuarios y otras operaciones administrativas
deben ejecutarse desde una función segura del servidor.

## Información necesaria del propietario

- Nombre oficial de la organización y nombre definitivo del portal.
- Logotipo autorizado y colores institucionales.
- Correo que será el administrador inicial.
- Proyecto de Supabase propio: `Project URL` y clave pública `anon`.
- Cuenta o repositorio de GitHub donde se publicará.
- Dominio propio, solamente si se desea usar uno.
- Confirmación de si deben migrarse datos del portal anterior.

No se deben enviar contraseñas personales ni la clave `service_role` por chat.

## Servicios opcionales

- Correo: Resend o Supabase Edge Functions. No es necesario para el núcleo.
- Dominio propio: se configura en el proveedor donde se publique.
- Logotipo oficial: usar únicamente un archivo autorizado por la institución.
