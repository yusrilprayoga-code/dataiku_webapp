# 🚀 Next.js Static Export Guide

## 📋 Build Commands untuk Different Deployment Scenarios

### 1. 🖥️ **Standard Development/Testing (Local Server)**
```bash
npm run build
```
- Menggunakan **absolute paths** (`/_next/...`)
- ✅ Navigation works perfectly
- ✅ Cocok untuk development dan testing dengan `npx serve out`

### 2. 🏢 **Dataiku Deployment (Subdirectory)**
```bash
# Windows PowerShell
$env:ASSET_PREFIX='./' ; npm run build

# macOS/Linux
ASSET_PREFIX='./' npm run build
```
- Menggunakan **relative paths** (`./...`)
- ✅ Cocok untuk deployment di subdirectory Dataiku
- ✅ Path portabel untuk berbagai environment

### 3. 🌐 **CDN Deployment**
```bash
# Windows PowerShell
$env:ASSET_PREFIX='https://your-cdn.com' ; npm run build

# macOS/Linux  
ASSET_PREFIX='https://your-cdn.com' npm run build
```

## 📁 Struktur Deployment Dataiku

```
plugin-folder/
├── webapps/
│   └── out/              ← Build result dari `npm run build` dengan ASSET_PREFIX='./'
│       ├── _next/
│       ├── index.html
│       └── ... (other files)
└── webapp.json           ← Configuration file
```

### 📄 **webapp.json Configuration**
```json
{
    "meta": {
        "label": "Next.js Data Platform",
        "description": "Universal data analysis platform"
    },
    "display": {
        "html": {
            "root": "out"
        }
    }
}
```

## 🔧 **Environment Variables (.env.local)**

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001

# Asset prefix (optional, diatur lewat command line)
ASSET_PREFIX=
```

## ⚠️ **Important Notes**

1. **Navigation Issue Fix**: Masalah 404 saat navigation telah diperbaiki dengan menggunakan conditional `assetPrefix`

2. **Font Configuration**: Menggunakan system fonts untuk menghindari konflik dengan Google Fonts saat static export

3. **Dynamic Routes**: Semua dynamic routes sudah dikonfigurasi dengan `generateStaticParams()` untuk static export

4. **Client-Side Rendering**: Pages yang memerlukan API calls sudah diubah ke CSR untuk kompatibilitas static export

## 🎯 **Testing Workflow**

1. **Test with absolute paths** (navigation):
   ```bash
   npm run build
   npx serve out
   ```

2. **Test with relative paths** (Dataiku deployment):
   ```bash
   $env:ASSET_PREFIX='./' ; npm run build
   # Upload folder 'out' ke Dataiku plugin webapps/
   ```

## ✅ **Status Checklist**

- ✅ Dynamic routes fixed with `generateStaticParams()`
- ✅ Server-side rendering converted to client-side
- ✅ Font configuration compatible with static export
- ✅ Navigation 404 issues resolved
- ✅ Conditional asset prefix for flexible deployment
- ✅ Ready for Dataiku deployment with relative paths
