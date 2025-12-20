import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ModalAsignarPermisosProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (permisos: string[]) => void;
  permisosIniciales?: string[];
}

const permisosDisponibles = [
  { id: 'ver_cuadres', label: 'Ver Cuadres', description: 'Permite visualizar cuadres de caja' },
  { id: 'agregar_cuadre', label: 'Agregar Cuadre', description: 'Permite crear nuevos cuadres' },
  { id: 'verificar_cuadres', label: 'Verificar Cuadres', description: 'Permite verificar cuadres pendientes' },
  { id: 'ver_cuadres_dia', label: 'Ver Cuadres por Día', description: 'Permite ver cuadres por día' },
  { id: 'modificar_cuadre', label: 'Modificar Cuadre', description: 'Permite modificar cuadres existentes' },
  { id: 'verificar_gastos', label: 'Verificar Gastos', description: 'Permite verificar gastos' },
  { id: 'cajeros', label: 'Gestionar Cajeros', description: 'Permite gestionar información de cajeros' },
  { id: 'comisiones', label: 'Gestionar Comisiones', description: 'Permite gestionar comisiones' },
  { id: 'acceso_admin', label: 'Acceso Administrador', description: 'Acceso completo al sistema' },
  { id: 'ver_resumen_mensual', label: 'Ver Resumen Mensual', description: 'Permite ver resúmenes mensuales' },
  { id: 'ver_ventas_totales', label: 'Ver Ventas Totales', description: 'Permite ver ventas totales' },
  { id: 'ver_about', label: 'Ver Información', description: 'Permite ver información del sistema' },
  { id: 'metas', label: 'Gestionar Metas', description: 'Permite gestionar metas de ventas' },
  { id: 'compras', label: 'Módulo de Compras', description: 'Permite gestionar compras y proveedores' },
  { id: 'resumen_venta_diaria', label: 'Resumen de Venta Diaria', description: 'Permite ver el resumen diario de ventas con detalles de productos vendidos' }
];

const ModalAsignarPermisos: React.FC<ModalAsignarPermisosProps> = ({
  open,
  onClose,
  onConfirm,
  permisosIniciales = []
}) => {
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>(permisosIniciales);

  const handlePermisoChange = (permisoId: string, checked: boolean) => {
    if (checked) {
      setPermisosSeleccionados(prev => [...prev, permisoId]);
    } else {
      setPermisosSeleccionados(prev => prev.filter(p => p !== permisoId));
    }
  };

  const handleConfirm = () => {
    onConfirm(permisosSeleccionados);
    onClose();
  };

  const handleCancel = () => {
    setPermisosSeleccionados(permisosIniciales);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Permisos al Usuario</DialogTitle>
          <DialogDescription>
            Selecciona los permisos que deseas asignar al nuevo usuario. Los permisos determinan qué funciones podrá realizar en el sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {permisosDisponibles.map((permiso) => (
            <div key={permiso.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
              <Checkbox
                id={permiso.id}
                checked={permisosSeleccionados.includes(permiso.id)}
                onCheckedChange={(checked: boolean) => handlePermisoChange(permiso.id, checked)}
              />
              <div className="flex-1">
                <label htmlFor={permiso.id} className="text-sm font-medium text-gray-900 cursor-pointer">
                  {permiso.label}
                </label>
                <p className="text-xs text-gray-500 mt-1">{permiso.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
            Confirmar Permisos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalAsignarPermisos;
