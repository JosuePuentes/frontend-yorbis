# Instrucciones para Configurar CORS en el Backend

## Problema

El frontend está recibiendo errores de CORS al intentar hacer peticiones al backend:

```
Access to fetch at 'https://backend-yorbis.onrender.com/compras' from origin 'https://frontend-yorbis.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solución

El backend necesita configurar CORS para permitir peticiones desde el origen del frontend.

### Origen del Frontend
- **Producción**: `https://frontend-yorbis.vercel.app`
- **Desarrollo local**: `http://localhost:5173` (o el puerto que uses)

### Configuración en el Backend (FastAPI/Python)

Si el backend usa FastAPI, necesitas agregar middleware de CORS:

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-yorbis.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        # Agregar otros orígenes si es necesario
    ],
    allow_credentials=True,
    allow_methods=["*"],  # O especificar: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers=["*"],  # O especificar: ["Content-Type", "Authorization"]
)
```

### Configuración en el Backend (Express/Node.js)

Si el backend usa Express:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://frontend-yorbis.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Verificación

Después de configurar CORS, las peticiones deberían funcionar correctamente. El backend debe responder con los headers:

```
Access-Control-Allow-Origin: https://frontend-yorbis.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Notas Importantes

1. **En producción**: Asegúrate de incluir el origen exacto del frontend en producción
2. **En desarrollo**: Puedes usar `allow_origins=["*"]` temporalmente, pero NO en producción
3. **Credenciales**: Si usas `allow_credentials=True`, NO puedes usar `allow_origins=["*"]`
4. **OPTIONS**: El navegador hace una petición OPTIONS (preflight) antes de las peticiones POST/PUT, asegúrate de manejarla

### Testing

Puedes verificar la configuración de CORS haciendo una petición OPTIONS:

```bash
curl -X OPTIONS https://backend-yorbis.onrender.com/compras \
  -H "Origin: https://frontend-yorbis.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

Deberías ver los headers `Access-Control-Allow-*` en la respuesta.

