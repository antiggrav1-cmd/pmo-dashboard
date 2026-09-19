export const INITIAL_PORTFOLIOS = [
  {
    id: "port-1",
    name: "Portafolio Principal - Santander & Boyacá",
    description: "Seguimiento de proyectos de generación y transmisión 2026-2027",
    code: "PORT-01",
    createdAt: "2026-01-15",
    projects: [
      {
        id: "proj-1",
        xm: "Estado_ElPaseo_Oct26.pdf",
        xmUrl: "https://example.com/reports/Estado_ElPaseo_Oct26.pdf",
        name: "El Paseo",
        fpo: "2026-10-13",
        cod: "2026-10-23",
        realProgress: 70.71,
        scheduledProgress: 83.48,
        gap: -12.8,
        previousGap: -19.9,
        status: "Atrasado",
        notes: "Retraso en entrega de transformador principal. Plan de aceleración en curso.",
        manager: "Ing. Carlos Mendoza",
        equipment: {
          paneles: { status: "En sitio", progress: 100, eta: "2026-08-10", brand: "Trina Vertex 665W", notes: "100% en bodega" },
          trackers: { status: "Instalado", progress: 95, eta: "2026-07-20", brand: "Nextracker Horizon", notes: "Montaje finalizado" },
          shelter: { status: "En tránsito", progress: 70, eta: "2026-09-15", brand: "Schneider Electric", notes: "En puerto Buenaventura" },
          inversores: { status: "En sitio", progress: 100, eta: "2026-08-22", brand: "Huawei SUN2000-330KTL", notes: "En sitio" },
          reconectador: { status: "Retrasado", progress: 40, eta: "2026-10-05", brand: "Noja Power OSM38", notes: "Retraso de fábrica 2 semanas" }
        },
        comments: [
          {
            id: "cmt-1",
            proyectoId: "proj-1",
            restriccion: "Suministro",
            comentario: "Retrasos en la llegada de insumos y transformador principal",
            responsable: "Ana Gómez",
            estado: "En curso",
            notas: "¿Hay alguna novedad con los insumos faltantes en puerto?",
            respuesta: "Monitorear contrataciones y despacho terrestre desde Buenaventura.",
            fecha: "2026-09-12T14:30:00.000Z",
            fechaUltimaEdicion: null
          },
          {
            id: "cmt-2",
            proyectoId: "proj-1",
            restriccion: "OR/CREG",
            comentario: "Pendiente definir con el operador de red el punto de conexión y pruebas.",
            responsable: "Juan Calle",
            estado: "En revisión",
            notas: "¿Ya se entregó el borrador revisado al OR?",
            respuesta: "En revisión con el equipo técnico para radicación esta semana.",
            fecha: "2026-09-08T09:15:00.000Z",
            fechaUltimaEdicion: null
          }
        ]
      },
      {
        id: "proj-2",
        xm: "Estado_GironOcc_Nov26.pdf",
        xmUrl: "https://example.com/reports/Estado_GironOcc_Nov26.pdf",
        name: "Giron Occidente",
        fpo: "2026-11-12",
        cod: "2026-11-20",
        realProgress: 53.00,
        scheduledProgress: 88.80,
        gap: -35.8,
        previousGap: -37.8,
        status: "Atrasado",
        notes: "Trámite de servidumbre en predio norte en negociación.",
        manager: "Ing. Laura Ríos",
        equipment: {
          paneles: { status: "En tránsito", progress: 80, eta: "2026-09-25", brand: "Jinko Tiger Pro 550W", notes: "Lote 2 navegando" },
          trackers: { status: "En sitio", progress: 100, eta: "2026-08-12", brand: "Soltec SF7", notes: "Estructura entregada" },
          shelter: { status: "En fabricación", progress: 50, eta: "2026-10-10", brand: "Ingeteam Power Station", notes: "En fábrica España" },
          inversores: { status: "En tránsito", progress: 60, eta: "2026-10-01", brand: "Sungrow SG350HX", notes: "Embarcado" },
          reconectador: { status: "En fabricación", progress: 45, eta: "2026-10-20", brand: "ABB OVR-3", notes: "Pruebas FAT en fábrica" }
        },
        comments: [
          {
            id: "cmt-3",
            proyectoId: "proj-2",
            restriccion: "Logística",
            comentario: "Adecuaciones en vía de acceso y puente terciario",
            responsable: "Carlos Mendoza",
            estado: "Pendiente",
            notas: "¿Se autorizó el paso de camiones pesados por la alcaldía?",
            respuesta: "Reunión programada con la Secretaría de Infraestructura.",
            fecha: "2026-09-11T16:45:00.000Z",
            fechaUltimaEdicion: null
          },
          {
            id: "cmt-4",
            proyectoId: "proj-2",
            restriccion: "Montaje",
            comentario: "Reanudar las actividades de cerramiento y zanjado",
            responsable: "Laura Ríos",
            estado: "En curso",
            notas: "¿Se completó la contratación de cuadrilla local?",
            respuesta: "Cuadrilla ingresa el próximo lunes.",
            fecha: "2026-09-10T11:20:00.000Z",
            fechaUltimaEdicion: null
          }
        ]
      },
      {
        id: "proj-3",
        xm: "",
        xmUrl: "",
        name: "Giron sur 1",
        fpo: "2026-12-30",
        cod: "2027-01-05",
        realProgress: 46.30,
        scheduledProgress: 64.37,
        gap: -18.1,
        previousGap: -36.8,
        status: "Atrasado",
        notes: "Mejora de 18.7% en GAP respecto al corte anterior.",
        manager: "Ing. Laura Ríos",
        equipment: {
          paneles: { status: "En tránsito", progress: 50, eta: "2026-10-15", brand: "Trina 665W", notes: "Despacho marítimo" },
          trackers: { status: "En sitio", progress: 85, eta: "2026-09-10", brand: "Nextracker", notes: "Hincado en curso" },
          shelter: { status: "En fabricación", progress: 30, eta: "2026-11-05", brand: "Schneider", notes: "Planos aprobados" },
          inversores: { status: "En fabricación", progress: 40, eta: "2026-10-30", brand: "Huawei", notes: "Programado para embarque" },
          reconectador: { status: "Pendiente OC", progress: 10, eta: "2026-11-20", brand: "Noja Power", notes: "OC en emisión" }
        }
      },
      {
        id: "proj-4",
        xm: "",
        xmUrl: "",
        name: "Giron sur 2",
        fpo: "2027-01-22",
        cod: "2027-02-02",
        realProgress: 40.05,
        scheduledProgress: 83.11,
        gap: -43.1,
        previousGap: -37.0,
        status: "Atrasado",
        notes: "Se incrementó la desviación por lluvias en terreno.",
        manager: "Ing. Andrés Gómez",
        equipment: {
          paneles: { status: "En tránsito", progress: 40, eta: "2026-11-01", brand: "Longi Hi-MO 5", notes: "En aduana" },
          trackers: { status: "En sitio", progress: 70, eta: "2026-09-20", brand: "Soltec", notes: "En sitio" },
          shelter: { status: "Retrasado", progress: 20, eta: "2026-11-30", brand: "Ingeteam", notes: "Alerta por suministro de celdas" },
          inversores: { status: "En tránsito", progress: 50, eta: "2026-11-15", brand: "Sungrow", notes: "En tránsito" },
          reconectador: { status: "Pendiente OC", progress: 0, eta: "2026-12-10", brand: "ABB", notes: "Cotización técnica" }
        }
      },
      {
        id: "proj-5",
        xm: "",
        xmUrl: "",
        name: "Confines 1",
        fpo: "2027-01-06",
        cod: "2027-01-19",
        realProgress: 37.50,
        scheduledProgress: 85.70,
        gap: -48.2,
        previousGap: -47.5,
        status: "Atrasado",
        notes: "Montaje electromecánico pendiente de cuadrilla extra.",
        manager: "Ing. Diego Torres",
        equipment: {
          paneles: { status: "En tránsito", progress: 60, eta: "2026-10-25", brand: "Trina Solar", notes: "En tránsito marítimo" },
          trackers: { status: "En sitio", progress: 90, eta: "2026-09-05", brand: "Nextracker", notes: "90% montado" },
          shelter: { status: "En fabricación", progress: 35, eta: "2026-11-15", brand: "Schneider", notes: "Fabricación" },
          inversores: { status: "En tránsito", progress: 50, eta: "2026-11-05", brand: "Huawei", notes: "En tránsito" },
          reconectador: { status: "En fabricación", progress: 20, eta: "2026-12-01", brand: "Noja Power", notes: "Fabricación" }
        }
      },
      {
        id: "proj-6",
        xm: "",
        xmUrl: "",
        name: "Confines 2",
        fpo: "2027-01-04",
        cod: "2027-01-19",
        realProgress: 31.55,
        scheduledProgress: 87.20,
        gap: -55.7,
        previousGap: -55.2,
        status: "Atrasado",
        notes: "Revisión técnica de obras civiles en progreso.",
        manager: "Ing. Diego Torres",
        equipment: {
          paneles: { status: "En fabricación", progress: 30, eta: "2026-11-10", brand: "Trina Solar", notes: "Producción de celdas" },
          trackers: { status: "En tránsito", progress: 50, eta: "2026-10-15", brand: "Nextracker", notes: "En puerto" },
          shelter: { status: "En fabricación", progress: 20, eta: "2026-11-20", brand: "Schneider", notes: "En fábrica" },
          inversores: { status: "En fabricación", progress: 25, eta: "2026-11-20", brand: "Huawei", notes: "En producción" },
          reconectador: { status: "Pendiente OC", progress: 0, eta: "2026-12-15", brand: "Noja Power", notes: "Por emitir" }
        }
      },
      {
        id: "proj-7",
        xm: "",
        xmUrl: "",
        name: "Tunja",
        fpo: "2027-01-13",
        cod: "2027-01-23",
        realProgress: 20.00,
        scheduledProgress: 91.20,
        gap: -71.2,
        previousGap: -71.2,
        status: "Atrasado",
        notes: "En revisión con el regulador y contratista EPC.",
        manager: "Ing. Patricia Ortiz",
        equipment: {
          paneles: { status: "En fabricación", progress: 20, eta: "2026-11-30", brand: "Jinko Solar", notes: "Fábrica" },
          trackers: { status: "En fabricación", progress: 20, eta: "2026-11-25", brand: "Soltec", notes: "En fabricación" },
          shelter: { status: "Retrasado", progress: 10, eta: "2026-12-10", brand: "Ingeteam", notes: "Retraso componentes" },
          inversores: { status: "En fabricación", progress: 20, eta: "2026-12-05", brand: "Sungrow", notes: "En fabricación" },
          reconectador: { status: "Pendiente OC", progress: 0, eta: "2026-12-20", brand: "ABB", notes: "Pendiente" }
        }
      },
      {
        id: "proj-8",
        xm: "",
        xmUrl: "",
        name: "Sotaquirá",
        fpo: "",
        cod: "",
        realProgress: 0.00,
        scheduledProgress: 0.00,
        gap: 0.0,
        previousGap: 0.0,
        status: "En tiempo",
        notes: "Fase preliminar de permisos ambientales.",
        manager: "Ing. Patricia Ortiz",
        equipment: {
          paneles: { status: "Pendiente OC", progress: 0, eta: "", brand: "Por definir", notes: "En diseño" },
          trackers: { status: "Pendiente OC", progress: 0, eta: "", brand: "Por definir", notes: "En diseño" },
          shelter: { status: "Pendiente OC", progress: 0, eta: "", brand: "Por definir", notes: "En diseño" },
          inversores: { status: "Pendiente OC", progress: 0, eta: "", brand: "Por definir", notes: "En diseño" },
          reconectador: { status: "Pendiente OC", progress: 0, eta: "", brand: "Por definir", notes: "En diseño" }
        }
      }
    ]
  },
  {
    id: "port-2",
    name: "Portafolio Costa Norte - Solar",
    description: "Parques solares fotovoltaicos en Cesar, Magdalena y Atlántico",
    code: "PORT-02",
    createdAt: "2026-02-01",
    projects: [
      {
        id: "proj-201",
        xm: "Estado_LaGuajira_1.pdf",
        xmUrl: "https://example.com/reports/Estado_LaGuajira_1.pdf",
        name: "Parque Solar Guajira I",
        fpo: "2026-11-30",
        cod: "2026-12-15",
        realProgress: 82.00,
        scheduledProgress: 80.00,
        gap: 2.0,
        previousGap: -1.5,
        status: "Adelantado",
        notes: "Paneles instalados al 95%. Pruebas de inversor en marcha.",
        manager: "Ing. Roberto Peña",
        equipment: {
          paneles: { status: "Instalado", progress: 95, eta: "2026-07-15", brand: "Trina 665W", notes: "Montaje casi terminado" },
          trackers: { status: "Instalado", progress: 100, eta: "2026-06-30", brand: "Nextracker", notes: "100% montado" },
          shelter: { status: "En sitio", progress: 100, eta: "2026-08-10", brand: "Schneider", notes: "En sitio y energizado" },
          inversores: { status: "Instalado", progress: 90, eta: "2026-08-01", brand: "Huawei", notes: "En conexionado" },
          reconectador: { status: "En sitio", progress: 100, eta: "2026-08-25", brand: "Noja Power", notes: "En sitio" }
        }
      },
      {
        id: "proj-202",
        xm: "Estado_Valledupar_FV.pdf",
        xmUrl: "https://example.com/reports/Estado_Valledupar_FV.pdf",
        name: "Valledupar Solar 50MW",
        fpo: "2027-03-15",
        cod: "2027-03-30",
        realProgress: 45.00,
        scheduledProgress: 44.50,
        gap: 0.5,
        previousGap: 0.0,
        status: "En tiempo",
        notes: "Hitos de cimentación e hincado al 100%.",
        manager: "Ing. Sofia Morales",
        equipment: {
          paneles: { status: "En tránsito", progress: 60, eta: "2026-11-15", brand: "Jinko Solar", notes: "En barco" },
          trackers: { status: "En sitio", progress: 90, eta: "2026-09-10", brand: "Soltec", notes: "Estructuras en sitio" },
          shelter: { status: "En fabricación", progress: 40, eta: "2026-12-01", brand: "Ingeteam", notes: "Fabricación" },
          inversores: { status: "En tránsito", progress: 50, eta: "2026-11-20", brand: "Sungrow", notes: "En tránsito" },
          reconectador: { status: "En fabricación", progress: 30, eta: "2026-12-15", brand: "ABB", notes: "En fábrica" }
        }
      }
    ]
  }
];
