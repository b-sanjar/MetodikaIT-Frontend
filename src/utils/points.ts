// Display-only copy of the rating rules; the backend does the actual math
// when a journal cell is saved (see API_ENDPOINTS.md, PUT /api/journal/cell).
export const POINT_RULES = [
  { label: 'Darsda «5» baho', value: '+15 ball' },
  { label: 'Darsda «4» baho', value: '+10 ball' },
  { label: 'Darsda «3» baho', value: '+5 ball' },
  { label: 'Darsga kelgani uchun', value: '+2 ball' },
  { label: 'Kechikib kelgani uchun', value: '+1 ball' },
  { label: 'O‘qituvchi rag‘bati (faollik, loyiha...)', value: '+5…+50 ball' },
]
