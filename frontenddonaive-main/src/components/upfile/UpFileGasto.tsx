import React, { useRef, useState, useMemo, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Usar la función de UpFile.tsx para unificar la obtención de presigned-url
export async function getPresignedUrl(
  objectName: string,
  operation: "put_object" | "get_object",
  contentType?: string,
  expiresIn?: number
): Promise<string> {
  const defaultExpiresIn = operation === "get_object" ? 3600 : 600;
  const res = await fetch(`${API_BASE_URL}/presigned-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object_name: objectName,
      operation: operation,
      content_type: contentType,
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

interface UpFileGastoProps {
  onUploadSuccess?: (objectName: string) => void;
  label?: string;
  maxSizeMB?: number;
  allowedFileTypes?: string[];
  initialFileUrl?: string;
  objectPath?: string;
}

const UpFileGasto: React.FC<UpFileGastoProps> = ({
  onUploadSuccess,
  label = "Subir comprobante de gasto",
  maxSizeMB = 5,
  allowedFileTypes = ["image/*"],
  initialFileUrl,
  objectPath = "gastos/",
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedObjectName, setUploadedObjectName] = useState<string>(initialFileUrl || "");

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setUploading(false);
    setProgress(0);
    setError("");
    setStatusMessage("");
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
      const objectName = `${objectPath}${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      const presignedUrl = await getPresignedUrl(
        objectName,
        "put_object",
        selectedFile.type
      );
      setStatusMessage("Subiendo archivo...");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
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
            setUploadedObjectName(objectName);
            if (onUploadSuccess) {
              onUploadSuccess(objectName);
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
        xhr.onabort = () => reject(new Error("Subida cancelada."));
        xhr.send(selectedFile);
      });
    } catch (err: any) {
      setError(err.message || "Error inesperado durante la subida.");
      setStatusMessage("Error en la subida.");
    } finally {
      setUploading(false);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const previewUrl = useMemo(() => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  }, [selectedFile]);

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
      <input
        type="file"
        accept={allowedFileTypes.join(",")}
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
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
      {initialFileUrl && !selectedFile && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600">Archivo actual:</p>
          <img
            src={`${API_BASE_URL}/presigned-url-get-gasto?object_name=${initialFileUrl}`}
            alt="Archivo actual"
            className="max-w-full h-auto max-h-48 rounded-md border border-gray-200 object-contain mx-auto"
          />
        </div>
      )}
    </div>
  );
};

export default UpFileGasto;
