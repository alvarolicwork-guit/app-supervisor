import { AperturaServicioExtra, CierreServicioExtra } from './servicioExtraordinario';

export interface ServicioJefeOperativo {
    id?: string;
    uidJefe: string; 
    estado: 'abierto' | 'cerrado';
    
    apertura: AperturaServicioExtra;
    cierre?: CierreServicioExtra;
    
    createdAt: Date;
    updatedAt: Date;
}
