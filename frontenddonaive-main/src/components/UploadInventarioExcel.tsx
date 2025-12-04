import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, X, CheckCircle2, RefreshCw } from "lucide-react";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Sucursal {
  id: string;
  nombre: string;
}

interface ProductoInventario {
  codigo: string;
  descripcion: string;
  marca: string;
  existencia: number;
  costo: number;
  precio: number;
}

interface UploadInventarioExcelProps {
  sucursales: Sucursal[];
  onSuccess?: () => void;
}

const UploadInventarioExcel: React.FC<UploadInventarioExcelProps> = ({
  sucursales,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("");
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar que se haya seleccionado una sucursal primero
    if (!sucursalSeleccionada) {
      setError("Por favor, selecciona una sucursal antes de elegir el archivo");
      e.target.value = ""; // Limpiar el input
      return;
    }

    // Validar extensión
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") {
      setError("Por favor, selecciona un archivo Excel (.xlsx o .xls)");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(false);
    setPreview(false);
    setProductos([]);

    // Leer y parsear el archivo
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        // Importación dinámica de xlsx para evitar problemas de build
        const XLSXModule = await import("xlsx");
        const XLSX = XLSXModule.default || XLSXModule;
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Validar que tenga al menos una fila de datos
        if (jsonData.length < 2) {
          setError("El archivo Excel debe tener al menos una fila de datos (después del encabezado)");
          return;
        }

        // Obtener encabezados (primera fila)
        const headers = (jsonData[0] as any[]).map((h: any) =>
          String(h || "").toLowerCase().trim()
        );

        // Buscar índices de columnas - TODAS son requeridas
        const codigoIdx = headers.findIndex((h) =>
          ["codigo", "código", "code"].includes(h)
        );
        const descripcionIdx = headers.findIndex((h) =>
          ["descripcion", "descripción", "descrip", "producto", "nombre"].includes(h)
        );
        const marcaIdx = headers.findIndex((h) =>
          ["marca", "brand"].includes(h)
        );
        const costoIdx = headers.findIndex((h) =>
          ["costo", "cost", "precio_costo", "precio costo"].includes(h)
        );
        const precioIdx = headers.findIndex((h) =>
          ["precio", "price", "precio_venta", "precio venta"].includes(h)
        );
        const existenciaIdx = headers.findIndex((h) =>
          ["existencia", "stock", "cantidad", "cant"].includes(h)
        );

        // Validar que existan TODAS las columnas requeridas (ninguna es opcional)
        if (codigoIdx === -1 || descripcionIdx === -1 || marcaIdx === -1 || costoIdx === -1 || precioIdx === -1 || existenciaIdx === -1) {
          const faltantes = [];
          if (codigoIdx === -1) faltantes.push("CODIGO");
          if (descripcionIdx === -1) faltantes.push("DESCRIPCION");
          if (marcaIdx === -1) faltantes.push("MARCA");
          if (costoIdx === -1) faltantes.push("COSTO");
          if (precioIdx === -1) faltantes.push("PRECIO");
          if (existenciaIdx === -1) faltantes.push("EXISTENCIA");
          
          setError(
            `El archivo Excel debe contener TODAS las columnas requeridas. Faltan: ${faltantes.join(", ")}. El formato debe ser: CODIGO, DESCRIPCION, MARCA, COSTO, PRECIO, EXISTENCIA`
          );
          return;
        }

        // Parsear datos
        const productosParsed: ProductoInventario[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          const codigo = String(row[codigoIdx] || "").trim();
          const descripcion = String(row[descripcionIdx] || "").trim();
          const marca = String(row[marcaIdx] || "").trim();
          
          // Permitir valores vacíos o 0 para números
          const costo = parseFloat(String(row[costoIdx] || 0)) || 0;
          const precio = parseFloat(String(row[precioIdx] || 0)) || 0;
          const existencia = parseFloat(String(row[existenciaIdx] || 0)) || 0;

          // Permitir campos vacíos - guardar todo lo que esté en la fila
          // Solo saltar si la fila está completamente vacía
          if (codigo === "" && descripcion === "" && marca === "" && costo === 0 && precio === 0 && existencia === 0) {
            continue;
          }

          // Permitir valores NaN - convertirlos a 0 o string vacío según corresponda
          const costoFinal = isNaN(costo) ? 0 : costo;
          const precioFinal = isNaN(precio) ? 0 : precio;
          const existenciaFinal = isNaN(existencia) ? 0 : existencia;

          productosParsed.push({
            codigo: codigo || "", // Permitir código vacío
            descripcion: descripcion || "", // Permitir descripción vacía
            marca: marca || "", // Permitir marca vacía
            existencia: existenciaFinal,
            costo: costoFinal,
            precio: precioFinal,
          });
        }

        // No validar si hay productos - permitir incluso si están vacíos
        // Solo mostrar advertencia si realmente no hay datos
        if (productosParsed.length === 0) {
          setError("El archivo Excel no contiene datos para procesar. Verifique que haya al menos una fila con datos.");
          return;
        }

        setProductos(productosParsed);
        setPreview(true);
      } catch (err: any) {
        setError(`Error al leer el archivo: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setError("Error al leer el archivo");
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !sucursalSeleccionada || productos.length === 0) {
      setError("Por favor, completa todos los campos requeridos");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }

      // Transformar productos para que coincidan con lo que espera el backend
      // El backend espera: nombre (en lugar de descripcion) y stock (en lugar de existencia)
      const productosTransformados = productos.map((p) => ({
        codigo: p.codigo || "",
        nombre: p.descripcion || "",
        marca: p.marca || "",
        costo: p.costo || 0,
        precio: p.precio || 0,
        stock: p.existencia || 0,
      }));

      // Crear un AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos timeout (el backend tarda ~100 segundos)

      try {
        const response = await fetch(
          `${API_BASE_URL}/inventarios/upload-excel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sucursal: sucursalSeleccionada,
              productos: productosTransformados,
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = "Error al subir el inventario";
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch (e) {
            // Si no se puede parsear el JSON, usar el status text
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // La respuesta fue exitosa
        const responseData = await response.json().catch(() => null);
        console.log("Inventario subido exitosamente:", responseData);
        
        // IMPORTANTE: El backend debe crear el registro de inventario automáticamente
        // El frontend NO crea el registro para evitar duplicados
        // Si el backend no está creando el registro, debe implementarse en el backend
        
        setSuccess(true);
        setError(null);
        
        // Refrescar la lista inmediatamente (el registro se creará en background)
        if (onSuccess) {
          // Esperar un poco para que el backend termine de procesar
          setTimeout(() => {
            onSuccess();
          }, 500);
        }
        
        // Mostrar mensaje de éxito y limpiar después
        setTimeout(() => {
          setFile(null);
          setProductos([]);
          setSucursalSeleccionada("");
          setPreview(false);
          setSuccess(false);
        }, 3000); // Reducido a 3 segundos
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (err: any) {
      console.error("Error al subir inventario:", err);
      
      // Manejar diferentes tipos de errores
      if (err.name === 'AbortError') {
        setError("La operación tomó demasiado tiempo. Por favor, intenta de nuevo con un archivo más pequeño o verifica tu conexión.");
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("Error de conexión. Verifica tu conexión a internet o que el servidor esté disponible.");
      } else {
        setError(err.message || "Error al subir el inventario. Por favor, intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Subir Inventario desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Seleccionar Sucursal <span className="text-red-500">*</span>
            </label>
            <select
              value={sucursalSeleccionada}
              onChange={(e) => {
                setSucursalSeleccionada(e.target.value);
                // Si cambia la sucursal, limpiar el archivo seleccionado
                if (file) {
                  setFile(null);
                  setProductos([]);
                  setPreview(false);
                }
                setError(null);
              }}
              className="w-full border rounded-md px-3 py-2"
              disabled={loading}
              required
            >
              <option value="">Seleccione una sucursal</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id} value={sucursal.id}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Debe seleccionar una sucursal antes de cargar el archivo Excel
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Archivo Excel <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading || !sucursalSeleccionada}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Formato requerido:</strong> CODIGO, DESCRIPCION, MARCA, COSTO, PRECIO, EXISTENCIA
              <br />
              <span className="text-red-600">Todas las columnas son obligatorias</span>
            </p>
          </div>
        </div>

        {preview && productos.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-blue-800">
                📋 Vista Previa del Inventario: <span className="font-bold">{productos.length}</span> productos encontrados
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const XLSXModule = await import("xlsx");
                    const XLSX = XLSXModule.default || XLSXModule;
                    
                    // Preparar datos para Excel
                    const data = [
                      ["CODIGO", "DESCRIPCION", "MARCA", "COSTO", "PRECIO", "EXISTENCIA"],
                      ...productos.map(p => [
                        p.codigo || "",
                        p.descripcion || "",
                        p.marca || "",
                        p.costo || 0,
                        p.precio || 0,
                        p.existencia || 0
                      ])
                    ];

                    // Crear workbook
                    const ws = XLSX.utils.aoa_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Inventario");

                    // Generar nombre de archivo
                    const fecha = new Date().toISOString().split("T")[0];
                    const nombreArchivo = `Inventario_Preliminar_${fecha}.xlsx`;

                    // Descargar
                    (XLSXModule as any).writeFile(wb, nombreArchivo);
                  } catch (err: any) {
                    setError(`Error al exportar: ${err.message}`);
                  }
                }}
                className="text-xs"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Exportar Previa a Excel
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto border border-blue-200 rounded bg-white">
              <table className="w-full text-xs">
                <thead className="bg-blue-100 sticky top-0">
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Código</th>
                    <th className="text-left p-2 font-semibold">Descripción</th>
                    <th className="text-left p-2 font-semibold">Marca</th>
                    <th className="text-right p-2 font-semibold">Costo</th>
                    <th className="text-right p-2 font-semibold">Precio</th>
                    <th className="text-right p-2 font-semibold">Existencia</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p, idx) => (
                    <tr key={idx} className="border-b hover:bg-blue-50">
                      <td className="p-2">{p.codigo || <span className="text-gray-400 italic">(vacío)</span>}</td>
                      <td className="p-2">{p.descripcion || <span className="text-gray-400 italic">(vacío)</span>}</td>
                      <td className="p-2">{p.marca || <span className="text-gray-400 italic">(vacío)</span>}</td>
                      <td className="text-right p-2">{p.costo.toFixed(2)}</td>
                      <td className="text-right p-2">{p.precio.toFixed(2)}</td>
                      <td className="text-right p-2">{p.existencia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              💡 Esta es la vista previa de todos los productos que se cargarán. Puedes exportarla a Excel antes de subir.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Inventario subido exitosamente
          </div>
        )}

        <div className="flex justify-end gap-2">
          {file && (
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setProductos([]);
                setPreview(false);
                setError(null);
                setSuccess(false);
              }}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={
              !file ||
              !sucursalSeleccionada ||
              productos.length === 0 ||
              loading
            }
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir Inventario
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadInventarioExcel;

