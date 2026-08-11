# 🟩 Minecraft Lobby & Server Manager

Un panel de administración moderno, seguro y aislado con **Docker** para gestionar servidores de Minecraft **Java** y **Bedrock**, diseñado para funcionar tanto localmente como en servidores dedicados sin interfaz gráfica (*Headless Linux Servers*).

---

## ✨ Características Principales

- 🐳 **Aislamiento Total con Docker**: Cada servidor corre en su propio contenedor independiente (`itzg/minecraft-server` / `itzg/minecraft-bedrock-server`), permitiendo tener múltiples servidores encendidos al mismo tiempo.
- 📁 **Auto-Escaneo e Importación de Servidores Existentes**: Simplemente coloca la carpeta de tu servidor existente dentro del directorio `./Servers/`, haz clic en **Scan Folder** (o reinicia el panel) y se importará automáticamente leyendo sus propiedades (`server.properties`), tipo y motor.
- 🛠️ **Soporte para Múltiples Motores**: Paper, Forge, Fabric, Vanilla y descarga automática de **Modpacks de CurseForge** vía URL.
- 💻 **Consola Interactiva en Tiempo Real**: Streaming de logs en vivo a través de WebSockets con envío de comandos RCON interactivos.
- ⚙️ **Administrador de Mods y Archivos**: Sube `.jar`, activa o desactiva mods con un clic sin borrar los archivos.
- 🗺️ **Mapa en Vivo (Dynmap / BlueMap)**: Visor integrado para rastrear la posición de los jugadores en tiempo real.
- 👥 **Gestor de Jugadores**: Consulta quién está en línea y realiza acciones rápidas como **Kick**, **Ban** u **OP**.
- 💾 **Copias de Seguridad Automáticas (.zip)**: Genera y gestiona respaldos comprimidos de tus mundos.
- 🌐 **Túneles Remotos (playit.gg)**: Expón tus servidores a Internet para jugar con amigos desde cualquier lugar sin necesidad de abrir puertos en tu router.
- 🔐 **Autenticación JWT Segura**: Protección por contraseña master y cambio de clave desde la interfaz.

---

## 🚀 Requisitos Previos

1. **Node.js** v18 o superior.
2. **Docker** instalado y con permisos de ejecución (`sudo usermod -aG docker $USER`).

---

## 🛠️ Instalación y Despliegue (En Servidor Dedicado / PC)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/TU_USUARIO/mc-dashboard.git
cd mc-dashboard
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Iniciar el Servidor de Producción o Desarrollo

**Modo Desarrollo:**
```bash
npm run dev
```

**Modo Producción (Recomendado para servidores 24/7):**
```bash
npm run build
npm start
```

---

## 📂 Cómo Importar Servidores Existentes

1. Copia tu carpeta de servidor existente dentro del directorio `./Servers/`:
   ```bash
   ./Servers/Mi_Servidor_Survival/
   ```
2. Abre la interfaz web y presiona el botón **`SCAN FOLDER`** (o simplemente reinicia el panel).
3. El sistema detectará automáticamente el puerto, el tipo (*Java* o *Bedrock*) y el motor, agregándolo al panel de control listo para encender.

---

## 🌐 Acceso Remoto desde Otro Equipo

Para acceder a la interfaz desde cualquier otro ordenador o teléfono en tu red local o Internet:

1. Encuentra la IP local de tu servidor:
   ```bash
   ip a
   ```
2. Abre el navegador en otro dispositivo e ingresa:
   ```text
   http://IP_DE_TU_SERVIDOR:3000
   ```
3. Ingresa la clave inicial: **`admin`** y cámbiala inmediatamente usando el icono de la llave (🔑).

---

## 📤 Pasos para Subir a GitHub

Si deseas subir tus cambios a tu repositorio de GitHub por primera vez:

```bash
git init
git add .
git commit -m "Initial commit - Complete Minecraft Server Manager"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mc-dashboard.git
git push -u origin main
```
