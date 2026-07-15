// Catálogo fijo de colegios soportados por el sistema (red de 2 colegios).
// Debe coincidir con SCHOOL_IDS en academic-service/app/schemas/schemas.py.
export const SCHOOLS = [
  { id: 'SCH-GOTITAS', name: 'Colegio Gotitas del Saber' },
  { id: 'SCH-SANGABRIEL', name: 'Colegio San Gabriel' },
]

export function getSchoolName(schoolId) {
  return SCHOOLS.find((school) => school.id === schoolId)?.name || schoolId || 'Sin institución'
}
