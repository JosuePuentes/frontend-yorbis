import React, { useRef, useState, useMemo, useCallback } from "react";

// La función para obtener la URL prefirmada puede vivir fuera del componente
// o en un archivo de servicios, ya que es una lógica reusable.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Función para obtener una URL prefirmada desde el backend.
 * @param objectName - El nombre del objeto en el bucket (ej. 'uploads/imagen.jpg').
 * @param operation - La operación deseada ('put_object' para subir, 'get_object' para descargar).
 * @param contentType - El tipo de contenido del archivo (ej. 'image/jpeg'), necesario para 'put_object'.
 * @param expiresIn - Duración de la validez de la URL en segundos (por defecto 1 hora para GET, 10 minutos para PUT).
 * @returns La URL prefirmada.
 * @throws Error si la URL prefirmada no se puede obtener.
 */
export async function getPresignedUrl(
  objectName: string,
  operation: "put_object" | "get_object",
  contentType?: string,
  expiresIn?: number
): Promise<string> {
  const defaultExpiresIn = operation === "get_object" ? 3600 : 600; // 1h para GET, 10min para PUT
  const res = await fetch(`${API_BASE_URL}/presigned-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object_name: objectName,
      operation: operation,
      content_type: contentType, // Solo relevante para put_object
      expires_in: expiresIn || defaultExpiresIn,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.presigned_url) {
    throw new Error(
      data.error || `No se pudo obtener la URL prefirmada para ${operation}.`
    );
  }
  return data.presigned_url;
}

interface UpFileProps {
  onUploadSuccess?: (objectName: string) => void; // Llamado cuando se sube correctamente
  label?: string;
  maxSizeMB?: number; // Tamaño máximo en MB
  allowedFileTypes?: string[]; // Ejemplo: ['image/*', 'application/pdf']
  initialFileUrl?: string; // Para mostrar una imagen ya subida
  objectPath?: string; // Prefijo para el nombre del objeto en R2, ej: 'avatars/'
}

const UpFile: React.FC<UpFileProps> = ({
  onUploadSuccess,
  label = "Subir archivo", // Default label
  maxSizeMB = 5, // Default max size 5MB
  allowedFileTypes = ["image/*"], // Default: only images
  initialFileUrl,
  objectPath = "cuentasPorPagar/", // Default upload path
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>(""); // Mensajes de estado
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mantiene el nombre del objeto subido para referencia
  // Útil si quieres mostrar la URL pública después de la subida
  const [uploadedObjectName, setUploadedObjectName] = useState<string>(initialFileUrl || "");

  // Clear states when a new file is selected or component is reset
  const resetState = useCallback(() => {
    setSelectedFile(null);
    setUploading(false);
    setProgress(0);
    setError("");
    setStatusMessage("");
    // No reseteamos uploadedObjectName aquí si es initialFileUrl
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetState(); // Resetear estado al seleccionar un nuevo archivo
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validar tipo de archivo
      const isFileTypeAllowed = allowedFileTypes.some((type) => {
        if (type.endsWith("/*")) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isFileTypeAllowed) {
        setError(
          `Tipo de archivo no permitido. Tipos aceptados: ${allowedFileTypes.join(", ")}`
        );
        return;
      }

      // Validar tamaño
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`El archivo supera el límite de ${maxSizeMB} MB.`);
        return;
      }

      setSelectedFile(file);
      setStatusMessage(`Archivo seleccionado: ${file.name}`);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Por favor, selecciona un archivo primero.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");
    setStatusMessage("Obteniendo URL de subida...");

    try {
      const ext = selectedFile.name.split(".").pop();
      // Genera un nombre de objeto único con el prefijo deseado
      const objectName = `${objectPath}${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      // 1. Solicitar URL prefirmada al backend
      const presignedUrl = await getPresignedUrl(
        objectName,
        "put_object",
        selectedFile.type
      );

      setStatusMessage("Subiendo archivo...");

      // 2. Subir el archivo a la URL prefirmada usando XMLHttpRequest para progreso
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type); // Es importante enviar el Content-Type correcto

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const currentProgress = Math.round((e.loaded / e.total) * 100);
            setProgress(currentProgress);
            setStatusMessage(`Subiendo: ${currentProgress}%`);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            setProgress(100);
            setStatusMessage("¡Subida completada!");
            setUploadedObjectName(objectName); // Guarda el nombre del objeto para futuras referencias
            if (onUploadSuccess) {
              onUploadSuccess(objectName); // Notifica al componente padre el nombre del objeto
            }
            resolve();
          } else {
            reject(
              new Error(
                `Error al subir el archivo: ${xhr.status} ${xhr.statusText}`
              )
            );
          }
        };

        xhr.onerror = () =>
          reject(new Error("Error de red o CORS al subir el archivo."));
        xhr.onabort = () => reject(new Error("Subida cancelada.")); // En caso de cancelación
        xhr.send(selectedFile);
      });
    } catch (err: any) {
      setError(err.message || "Error inesperado durante la subida.");
      setStatusMessage("Error en la subida.");
    } finally {
      setUploading(false);
    }
  };

  // Función para abrir el selector de archivos
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Previsualización de la imagen si es una imagen
  const previewUrl = useMemo(() => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  }, [selectedFile]);

  // Limpiar URL de objeto cuando el componente se desmonte o el archivo cambie
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="flex flex-col gap-3 p-4 border border-gray-300 rounded-lg shadow-sm bg-white">
      <label className="font-bold text-lg text-gray-800">{label}</label>

      {/* Input de archivo oculto */}
      <input
        type="file"
        accept={allowedFileTypes.join(",")} // Permite múltiples tipos
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden" // Ocultar el input nativo
      />

      {/* Botón personalizado para seleccionar archivo */}
      <button
        onClick={openFileSelector}
        disabled={uploading}
        className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out flex items-center justify-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-4 4 4 4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>{selectedFile ? "Cambiar archivo" : "Seleccionar archivo"}</span>
      </button>

      {/* Info del archivo seleccionado y acciones */}
      {selectedFile && (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span className="font-medium truncate">{selectedFile.name}</span>
            <span className="text-gray-500 ml-2">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>

          {previewUrl && (
            <div className="mt-2 text-center">
              <img
                src={previewUrl}
                alt="Previsualización"
                className="max-w-full h-auto max-h-48 rounded-md border border-gray-200 object-contain mx-auto"
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`px-4 py-2 rounded-md text-white text-base font-semibold transition duration-150 ease-in-out ${
              uploading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            }`}
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Subiendo... {progress}%
              </span>
            ) : (
              "Subir archivo"
            )}
          </button>

          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Mensajes de estado y error */}
      {statusMessage && !error && (
        <p className="text-sm text-gray-600 mt-1">{statusMessage}</p>
      )}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

      {uploadedObjectName && !selectedFile && !uploading && !error && (
        <div className="flex items-center text-sm text-green-700 mt-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Archivo listo: `{uploadedObjectName}` (o vista previa si es una imagen)
        </div>
      )}
      {/* Opcional: mostrar la imagen ya subida si se proporciona initialFileUrl */}
      {initialFileUrl && !selectedFile && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600">Archivo actual:</p>
          <img
            src={`${API_BASE_URL}/presigned-url-get?object_name=${initialFileUrl}`} // Asume un endpoint GET simple en el backend
            alt="Archivo actual"
            className="max-w-full h-auto max-h-48 rounded-md border border-gray-200 object-contain mx-auto"
          />
        </div>
      )}
    </div>
  );
};

export default UpFile;